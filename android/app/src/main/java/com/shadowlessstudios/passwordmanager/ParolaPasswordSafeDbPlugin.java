package com.shadowlessstudios.passwordmanager;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import net.zetetic.database.sqlcipher.SQLiteDatabase;

/**
 * Read-only importer for passwordsafe.app SQLCipher 4 .db backups.
 * The source document never gets written; a private encrypted temporary
 * copy is deleted after the operation, even on wrong passwords.
 * No passphrase or plaintext database rows are logged or sent to the network.
 */
@CapacitorPlugin(name = "ParolaPasswordSafeDb")
public class ParolaPasswordSafeDbPlugin extends Plugin {
    private static final long MAX_DB_BYTES = 100L * 1024L * 1024L;
    private static final int MAX_RESULT_ROWS = 1500;
    private static final int MAX_TEXT_SIZE = 300_000;
    private static final int MAX_BLOB_SIZE = 2_000_000;
    private static final int MAX_RESULT_CHARS = 18_000_000;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void pickAndImport(PluginCall call) {
        final String passphrase = call.getString("password", "");
        if (passphrase == null || passphrase.isEmpty() || passphrase.length() > 4096) {
            call.reject("Bitte das Master-Passwort von Password Safe eingeben.");
            return;
        }
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType("*/*");
        picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, picker, "databaseSelected");
    }

    @ActivityCallback
    private void databaseSelected(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            call.reject("Dateiauswahl abgebrochen.");
            return;
        }
        final Uri source = result.getData().getData();
        final String password = call.getString("password", "");
        // Never execute PBKDF2 or read 20MB of database pages on the UI thread.
        worker.execute(() -> performImport(source, password, call));
    }

    private void performImport(Uri source, String password, PluginCall call) {
        File temp = null;
        SQLiteDatabase db = null;
        try {
            System.loadLibrary("sqlcipher");
            temp = File.createTempFile("parola_sqlcipher_", ".db", getContext().getCacheDir());
            long total = 0;
            try (InputStream in = getContext().getContentResolver().openInputStream(source);
                 FileOutputStream out = new FileOutputStream(temp)) {
                if (in == null) throw new IllegalArgumentException("Die Datei kann nicht geöffnet werden.");
                byte[] buffer = new byte[64 * 1024];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    total += n;
                    if (total > MAX_DB_BYTES) throw new IllegalArgumentException("Die Datenbank überschreitet 100 MB.");
                    out.write(buffer, 0, n);
                }
                out.getFD().sync();
            }
            // SQLCipher defaults to 4096-byte pages and a random 16-byte salt.
            // This is a format check only: the password is verified by SQLCipher.
            if (total < 4096 || total % 4096 != 0) {
                throw new IllegalArgumentException("Die Datei ist keine unterstützte SQLCipher-4-Datenbank.");
            }
            db = SQLiteDatabase.openOrCreateDatabase(temp, password, null, null, null);
            // Check HMAC / page integrity before ever querying tables.
            try (Cursor c = db.rawQuery("SELECT count(*) FROM sqlite_master", null)) {
                if (!c.moveToFirst()) throw new IllegalArgumentException("Datenbank nicht lesbar.");
            }
            db.execSQL("PRAGMA query_only = ON");
            JSObject payload = exportTables(db);
            getActivity().runOnUiThread(() -> call.resolve(payload));
        } catch (Exception ex) {
            // Don't echo exception text: SQL errors can disclose schema or rows.
            String message = ex instanceof IllegalArgumentException
              ? ex.getMessage()
              : "Datenbank konnte nicht entsperrt werden. Master-Passwort und SQLCipher-Format prüfen.";
            getActivity().runOnUiThread(() -> call.reject(message));
        } finally {
            if (db != null) try { db.close(); } catch (Exception ignored) {}
            if (temp != null && temp.exists()) {
                try { if (!temp.delete()) temp.deleteOnExit(); } catch (Exception ignored) {}
            }
        }
    }

    private JSObject exportTables(SQLiteDatabase db) throws Exception {
        JSArray tables = new JSArray();
        int exportedRows = 0;
        int emittedChars = 0;
        int omittedBinary = 0;
        try (Cursor schema = db.rawQuery(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name", null)) {
            while (schema.moveToNext()) {
                String tableName = schema.getString(0);
                if (!isSafeIdentifier(tableName)) continue;
                JSArray columns = new JSArray();
                ArrayList<String> columnNames = new ArrayList<>();
                // PRAGMA does not accept bound table identifiers. Quote defensively.
                try (Cursor cols = db.rawQuery("PRAGMA table_info(\"" +
                    tableName.replace("\"", "\"\"") + "\")", null)) {
                    while (cols.moveToNext()) {
                        String name = cols.getString(cols.getColumnIndexOrThrow("name"));
                        if (isSafeIdentifier(name)) {
                            columnNames.add(name);
                            columns.put(name);
                        }
                    }
                }
                if (columnNames.isEmpty()) continue;
                JSObject table = new JSObject();
                table.put("name", tableName);
                table.put("columns", columns);
                int rowCount = 0;
                try (Cursor counted = db.rawQuery(
                    "SELECT count(*) FROM \"" + tableName.replace("\"", "\"\"") + "\"", null)) {
                    if (counted.moveToFirst()) rowCount = counted.getInt(0);
                }
                table.put("rowCount", rowCount);
                JSArray rows = new JSArray();
                if (isEntryCandidate(tableName, columnNames)) {
                    try (Cursor records = db.rawQuery(
                        "SELECT * FROM \"" + tableName.replace("\"", "\"\"") + "\" LIMIT 1501", null)) {
                        while (records.moveToNext()) {
                            if (++exportedRows > MAX_RESULT_ROWS) throw new IllegalArgumentException(
                                "Mehr als 1500 Datenbankeinträge – bitte zunächst einen CSV-Export verwenden.");
                            JSObject row = new JSObject();
                            for (int i = 0; i < records.getColumnCount(); i++) {
                                String name = records.getColumnName(i);
                                if (!isSafeIdentifier(name)) continue;
                                switch (records.getType(i)) {
                                    case Cursor.FIELD_TYPE_NULL: row.put(name, ""); break;
                                    case Cursor.FIELD_TYPE_INTEGER: row.put(name, String.valueOf(records.getLong(i))); break;
                                    case Cursor.FIELD_TYPE_FLOAT: row.put(name, String.valueOf(records.getDouble(i))); break;
                                    case Cursor.FIELD_TYPE_BLOB:
                                        byte[] blob = records.getBlob(i);
                                        if (blob.length <= MAX_BLOB_SIZE && isImage(blob)) {
                                            row.put(name, imageUri(blob));
                                        } else if (blob.length > 0) {
                                            omittedBinary++;
                                            row.put(name, "");
                                        }
                                        break;
                                    default:
                                        String value = records.getString(i);
                                        if (value != null && value.length() > MAX_TEXT_SIZE) {
                                            throw new IllegalArgumentException("Ein Datenbankfeld ist zu groß.");
                                        }
                                        row.put(name, value == null ? "" : value);
                                }
                            }
                            emittedChars += row.toString().length();
                            if (emittedChars > MAX_RESULT_CHARS) throw new IllegalArgumentException(
                                "Datenbank enthält zu viele Anhänge für den Import in einem Schritt.");
                            rows.put(row);
                        }
                    }
                }
                table.put("rows", rows);
                tables.put(table);
            }
        }
        JSObject result = new JSObject();
        result.put("tables", tables);
        result.put("readRows", exportedRows);
        result.put("omittedBinaryFields", omittedBinary);
        result.put("format", "sqlcipher-v4");
        return result;
    }

    private static boolean isSafeIdentifier(String s) {
        return s != null && s.length() > 0 && s.length() < 130 && s.indexOf('\u0000') < 0;
    }

    private static boolean isEntryCandidate(String table, ArrayList<String> names) {
        String t = table.toLowerCase(Locale.ROOT);
        if (t.contains("audit") || t.contains("log") || t.contains("history") ||
            t.contains("sync") || t.contains("setting") || t.contains("meta") ||
            t.contains("category") || t.contains("template") || t.contains("field")) return false;
        Set<String> normalized = new HashSet<>();
        for (String name : names) normalized.add(name.toLowerCase(Locale.ROOT).replace("_",""));
        boolean title = hasAny(normalized, "title", "name", "titel", "entryname", "label", "description");
        boolean sensitive = hasAny(normalized, "password", "passwort", "secret", "username",
            "user", "login", "website", "url", "uri", "data", "content");
        return title && sensitive;
    }

    private static boolean hasAny(Set<String> known, String... candidates) {
        for (String candidate : candidates) if (known.contains(candidate)) return true;
        return false;
    }

    private static boolean isImage(byte[] b) {
        return b.length > 12 && (
            (b[0] == (byte)0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') ||
            (b[0] == (byte)0xff && b[1] == (byte)0xd8 && b[2] == (byte)0xff) ||
            (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' &&
                b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P'));
    }
    private static String imageUri(byte[] bytes) {
        String mime = bytes[0] == (byte)0x89 ? "image/png" :
                      bytes[0] == (byte)0xff ? "image/jpeg" : "image/webp";
        return "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    @Override protected void handleOnDestroy() {
        worker.shutdownNow();
    }
}

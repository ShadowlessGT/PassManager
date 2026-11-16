package com.shadowlessstudios.passwordmanager;

import android.database.Cursor;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import net.zetetic.database.sqlcipher.SQLiteDatabase;

/**
 * Schema-specific, read-only exporter for Password Safe (Android, SQLCipher).
 * Images stay in the encrypted source database until the user confirms import.
 * No credentials, field values, image bytes or password history are logged.
 */
final class PasswordSafeRelationalExporter {
    static final int MAX_ENTRIES = 1500;
    static final int MAX_VALUE_CHARS = 100_000;
    static final int MAX_IMAGES = 1000;
    static final int MAX_IMAGE_BYTES = 5_000_000;
    static final long MAX_TOTAL_IMAGE_BYTES = 55_000_000L;
    private static final int MAX_FIELDS = 50;
    private static final int MAX_HISTORY_PER_ENTRY = 50;

    private PasswordSafeRelationalExporter() {}

    private static String safeText(String value) {
        if (value == null) return "";
        if (value.length() > MAX_VALUE_CHARS) {
            throw new IllegalArgumentException("Ein Feld der Quelldatenbank überschreitet 100.000 Zeichen.");
        }
        return value;
    }

    private static boolean tableExists(SQLiteDatabase db, String name) {
        try (Cursor c = db.rawQuery(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?",
            new String[]{name})) {
            return c.moveToFirst() && c.getInt(0) > 0;
        }
    }

    private static void requireTables(SQLiteDatabase db) {
        for (String name : new String[]{
            "Passwords", "PasswordEntryElement", "PwEntryElementContent",
            "Categories", "PwCatRelations", "Images"
        }) {
            if (!tableExists(db, name)) {
                throw new IllegalArgumentException(
                    "Die Datenbank konnte entschlüsselt werden, verwendet aber nicht das erwartete Password-Safe-Tabellenschema.");
            }
        }
    }

    private static int tableCount(SQLiteDatabase db, String name) {
        if (!tableExists(db, name)) return 0;
        try (Cursor c = db.rawQuery("SELECT count(*) FROM \"" + name + "\"", null)) {
            return c.moveToFirst() ? c.getInt(0) : 0;
        }
    }

    static JSObject export(SQLiteDatabase db, String sqlcipherVersion, String session) {
        requireTables(db);
        final int entryCount = tableCount(db, "Passwords");
        final int imageCount = tableCount(db, "Images");
        if (entryCount > MAX_ENTRIES || imageCount > MAX_IMAGES) {
            throw new IllegalArgumentException("Die Quelle überschreitet die Importgrenze von 1500 Einträgen oder 1000 Bildern.");
        }
        final JSArray entries = new JSArray();
        final Map<Long, JSObject> byId = new HashMap<>();
        final Map<Long, JSArray> fields = new HashMap<>();
        final Map<Long, JSArray> categories = new HashMap<>();
        final Map<Long, JSArray> images = new HashMap<>();
        final Map<Long, JSArray> history = new HashMap<>();

        try (Cursor c = db.rawQuery(
            "SELECT ID, Name, CreatedAt, ModifiedAt FROM Passwords ORDER BY ID", null)) {
            while (c.moveToNext()) {
                long id = c.getLong(0);
                JSObject record = new JSObject();
                record.put("sourceId", String.valueOf(id));
                record.put("title", safeText(c.getString(1)));
                record.put("createdAt", safeText(c.getString(2)));
                record.put("modifiedAt", safeText(c.getString(3)));
                record.put("favorite", false);
                record.put("archived", false);
                record.put("iconIdentifier", "");
                JSArray rowFields = new JSArray();
                JSArray rowCategories = new JSArray();
                JSArray rowImages = new JSArray();
                JSArray rowHistory = new JSArray();
                record.put("fields", rowFields);
                record.put("categories", rowCategories);
                record.put("images", rowImages);
                record.put("history", rowHistory);
                byId.put(id, record);
                fields.put(id, rowFields);
                categories.put(id, rowCategories);
                images.put(id, rowImages);
                history.put(id, rowHistory);
                entries.put(record);
            }
        }
        int fieldCount = 0;
        try (Cursor c = db.rawQuery(
            "SELECT v.EntryID, e.Name, e.StandardKey, e.HandleAsPasswordField, " +
            "e.HandleAsWebsite, v.Value, v.OrderID " +
            "FROM PwEntryElementContent v " +
            "JOIN PasswordEntryElement e ON e.ID = v.ElementID " +
            "ORDER BY v.EntryID, v.OrderID, v.ID", null)) {
            while (c.moveToNext()) {
                long id = c.getLong(0);
                JSArray target = fields.get(id);
                if (target == null) throw new IllegalArgumentException("Ein Feld verweist auf einen fehlenden Quell-Eintrag.");
                if (target.length() >= MAX_FIELDS) throw new IllegalArgumentException("Ein Eintrag enthält mehr als 50 Zusatzfelder.");
                if (++fieldCount > MAX_ENTRIES * MAX_FIELDS) throw new IllegalArgumentException("Zu viele Datenbankfelder.");
                JSObject field = new JSObject();
                field.put("label", safeText(c.getString(1)));
                field.put("standardKey", safeText(c.getString(2)));
                field.put("isPassword", c.getInt(3) != 0);
                field.put("isWebsite", c.getInt(4) != 0);
                field.put("value", safeText(c.getString(5)));
                target.put(field);
            }
        }
        try (Cursor c = db.rawQuery(
            "SELECT r.EntryID, c.Name FROM PwCatRelations r " +
            "JOIN Categories c ON c.ID=r.CategoryID ORDER BY r.EntryID,r.ID", null)) {
            while (c.moveToNext()) {
                JSArray target = categories.get(c.getLong(0));
                if (target != null && target.length() < 80) target.put(safeText(c.getString(1)));
            }
        }

        if (tableExists(db, "Favorites")) {
            try (Cursor c = db.rawQuery("SELECT EntryID FROM Favorites", null)) {
                while (c.moveToNext()) {
                    JSObject target = byId.get(c.getLong(0));
                    if (target != null) target.put("favorite", true);
                }
            }
        }
        if (tableExists(db, "Archive")) {
            try (Cursor c = db.rawQuery("SELECT EntryID FROM Archive", null)) {
                while (c.moveToNext()) {
                    JSObject target = byId.get(c.getLong(0));
                    if (target != null) target.put("archived", true);
                }
            }
        }
        if (tableExists(db, "Icons")) {
            try (Cursor c = db.rawQuery("SELECT EntryID, Identifier FROM Icons ORDER BY ID", null)) {
                while (c.moveToNext()) {
                    JSObject target = byId.get(c.getLong(0));
                    if (target == null) {
                        throw new IllegalArgumentException("Ein Quell-Icon verweist auf einen fehlenden Eintrag.");
                    }
                    String identifier = safeText(c.getString(1));
                    if (!identifier.matches("[A-Za-z0-9_-]{1,64}") ||
                        !target.getString("iconIdentifier", "").isEmpty()) {
                        throw new IllegalArgumentException("Eine Quell-Icon-Zuordnung ist nicht eindeutig.");
                    }
                    target.put("iconIdentifier", identifier);
                }
            }
        }

        long totalImages = 0;
        final String imageSql = tableExists(db, "ImagesOrder")
          ? "SELECT i.ID, i.EntryID, length(i.Image) FROM Images i " +
            "LEFT JOIN ImagesOrder o ON o.ImageEntryID=i.ID " +
            "ORDER BY i.EntryID, COALESCE(o.OrderID, i.ID), i.ID"
          : "SELECT ID, EntryID, length(Image) FROM Images ORDER BY EntryID, ID";
        try (Cursor c = db.rawQuery(imageSql, null)) {
            while (c.moveToNext()) {
                JSArray target = images.get(c.getLong(1));
                if (target == null) throw new IllegalArgumentException("Ein Bild verweist auf einen fehlenden Quell-Eintrag.");
                long bytes = c.getLong(2);
                if (bytes < 1 || bytes > MAX_IMAGE_BYTES) {
                    throw new IllegalArgumentException("Ein Quellbild ist leer oder überschreitet 5 MB.");
                }
                totalImages += bytes;
                if (totalImages > MAX_TOTAL_IMAGE_BYTES) {
                    throw new IllegalArgumentException("Die Originalbilder überschreiten das Importlimit von 55 MB.");
                }
                JSObject image = new JSObject();
                image.put("id", String.valueOf(c.getLong(0)));
                image.put("byteLength", bytes);
                target.put(image);
            }
        }

        if (tableExists(db, "PasswordHistory")) {
            try (Cursor c = db.rawQuery(
                "SELECT h.EntryID, h.Value, h.Timestamp, e.Name, e.StandardKey, e.HandleAsPasswordField " +
                "FROM PasswordHistory h JOIN PasswordEntryElement e ON e.ID=h.ElementID " +
                "ORDER BY h.EntryID, h.Timestamp DESC, h.ID DESC", null)) {
                while (c.moveToNext()) {
                    JSArray target = history.get(c.getLong(0));
                    if (target == null) continue;
                    if (target.length() >= MAX_HISTORY_PER_ENTRY) {
                        throw new IllegalArgumentException(
                            "Ein Eintrag hat mehr als 50 historische Passwörter; vollständiger Import nicht möglich.");
                    }
                    JSObject h = new JSObject();
                    h.put("value", safeText(c.getString(1)));
                    h.put("timestamp", safeText(c.getString(2)));
                    h.put("label", safeText(c.getString(3)));
                    h.put("standardKey", safeText(c.getString(4)));
                    h.put("isPassword", c.getInt(5) != 0);
                    target.put(h);
                }
            }
        }

        // Never silently claim passkeys, arbitrary attachments or OTP state
        // were migrated: the current Parola vault has no equivalent structures.
        JSObject unsupported = new JSObject();
        for (String name : new String[]{"Passkeys","Attachments","OTP","Tombstones"}) {
            unsupported.put(name, tableCount(db, name));
        }
        JSArray sourceCategories = new JSArray();
        if (tableExists(db, "CategoriesColors")) {
            try (Cursor c = db.rawQuery(
                "SELECT c.Name, cc.Color FROM Categories c " +
                "LEFT JOIN CategoriesColors cc ON cc.Category=c.ID ORDER BY c.ID", null)) {
                while (c.moveToNext()) {
                    JSObject category = new JSObject();
                    category.put("name", safeText(c.getString(0)));
                    category.put("color", c.isNull(1) ? "" :
                        String.format(Locale.ROOT, "#%06X", c.getInt(1) & 0x00FFFFFF));
                    sourceCategories.put(category);
                }
            }
        }
        JSObject result = new JSObject();
        result.put("sourceCategories", sourceCategories);
        result.put("format", "passwordsafe-relational-v1");
        result.put("sqlcipherFormat", sqlcipherVersion);
        result.put("session", session);
        result.put("entries", entries);
        result.put("imageCount", imageCount);
        result.put("totalImageBytes", totalImages);
        result.put("categoryCount", tableCount(db, "Categories"));
        result.put("sourceIconCount", tableCount(db, "Icons"));
        result.put("historyCount", tableCount(db, "PasswordHistory"));
        result.put("unsupported", unsupported);
        result.put("readRows", entryCount);
        return result;
    }

    static String imageDataUri(SQLiteDatabase db, String imageId) {
        if (imageId == null || !imageId.matches("[0-9]{1,18}")) {
            throw new IllegalArgumentException("Ungültige Bildreferenz.");
        }
        try (Cursor c = db.rawQuery(
            "SELECT Image FROM Images WHERE ID=?", new String[]{imageId})) {
            if (!c.moveToFirst()) throw new IllegalArgumentException("Quellbild nicht vorhanden.");
            byte[] bytes = c.getBlob(0);
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
                throw new IllegalArgumentException("Quellbildgröße ist nicht unterstützt.");
            }
            String mime = mimeType(bytes);
            if (mime == null) throw new IllegalArgumentException("Unbekanntes Quellbildformat.");
            return "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        }
    }

    private static String mimeType(byte[] b) {
        if (b.length > 12 && b[0] == (byte)0x89 && b[1]=='P' && b[2]=='N' && b[3]=='G')
            return "image/png";
        if (b.length > 3 && b[0] == (byte)0xff && b[1] == (byte)0xd8 && b[2] == (byte)0xff)
            return "image/jpeg";
        if (b.length > 12 && b[0]=='R' && b[1]=='I' && b[2]=='F' &&
            b[8]=='W' && b[9]=='E' && b[10]=='B' && b[11]=='P')
            return "image/webp";
        return null;
    }
}

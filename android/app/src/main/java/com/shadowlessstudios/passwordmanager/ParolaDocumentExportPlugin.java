package com.shadowlessstudios.passwordmanager;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Android Storage Access Framework: user picks the final destination.
 * No intermediary plaintext CSV files, no broad storage permissions.
 */
@CapacitorPlugin(name = "ParolaDocumentExport")
public class ParolaDocumentExportPlugin extends Plugin {
    @PluginMethod
    public void saveDocument(PluginCall call) {
        String filename = call.getString("filename", "Parola-Export");
        String mime = call.getString("mimeType", "application/octet-stream");
        String contents = call.getString("contents");
        if (contents == null || contents.length() > 30_000_000) {
            call.reject("Export ist zu groß (maximal 30 MB).");
            return;
        }
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            call.reject("Ungültiger Dateiname.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "documentSelected");
    }

    @ActivityCallback
    private void documentSelected(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            call.reject("Speichern abgebrochen.");
            return;
        }
        Uri uri = result.getData().getData();
        String content = call.getString("contents");
        if (content == null) {
            call.reject("Exportinhalt fehlt.");
            return;
        }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "rwt")) {
            if (out == null) {
                call.reject("Datei kann nicht geöffnet werden.");
                return;
            }
            out.write(content.getBytes(StandardCharsets.UTF_8));
            out.flush();
            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            call.resolve(response);
        } catch (Exception ex) {
            // Never log sensitive data or file contents in error messages.
            call.reject("Export konnte nicht gespeichert werden.");
        }
    }
}

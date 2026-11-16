package com.shadowlessstudios.passwordmanager;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.autofill.AutofillManager;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name="ParolaAutofill")
public class ParolaAutofillPlugin extends Plugin {
    private AutofillManager manager() {
        return getContext().getSystemService(AutofillManager.class);
    }

    @PluginMethod public void getStatus(PluginCall call) {
        JSObject result=new JSObject();
        AutofillManager manager=manager();
        boolean supported=Build.VERSION.SDK_INT>=26 && manager!=null && manager.isAutofillSupported();
        result.put("supported",supported);
        result.put("serviceSelected",supported && manager.hasEnabledAutofillServices());
        result.put("captureEnabled",ParolaAutofillCaptureStore.isEnabled(getContext()));
        result.put("pendingCount",ParolaAutofillCaptureStore.list(getContext()).length());
        call.resolve(result);
    }

    @PluginMethod public void setCaptureEnabled(PluginCall call) {
        Boolean enabled=call.getBoolean("enabled");
        if(enabled==null){call.reject("Einstellung fehlt.");return;}
        ParolaAutofillCaptureStore.setEnabled(getContext(),enabled);
        getStatus(call);
    }

    @PluginMethod public void openSystemSettings(PluginCall call) {
        try {
            AutofillManager manager=manager();
            if(manager==null || !manager.isAutofillSupported()){call.reject("Android-Autofill nicht verfügbar.");return;}
            Intent intent=new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE);
            intent.setData(Uri.parse("package:"+getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch(Exception ex) {
            call.reject("Android-Autofill-Einstellungen konnten nicht geöffnet werden.");
        }
    }

    @PluginMethod public void listPending(PluginCall call) {
        JSObject response=new JSObject();
        response.put("items",ParolaAutofillCaptureStore.list(getContext()));
        call.resolve(response);
    }

    @PluginMethod public void readPending(PluginCall call) {
        try {
            if(!ParolaAutofillCaptureStore.isEnabled(getContext())) throw new SecurityException("Autofill deaktiviert.");
            String id=call.getString("id");
            if(id==null || !id.matches("[a-f0-9-]{36}")) throw new SecurityException("Ungültiger Eintrag.");
            KeyguardManager manager=(KeyguardManager)getContext().getSystemService(Context.KEYGUARD_SERVICE);
            if(manager==null || !manager.isDeviceSecure())throw new SecurityException("Sichere Gerätesperre erforderlich.");
            Intent confirm=manager.createConfirmDeviceCredentialIntent("Parola", "Erkannten Zugang zur Übernahme freigeben");
            if(confirm==null)throw new SecurityException("Gerätefreigabe nicht verfügbar.");
            startActivityForResult(call,confirm,"credentialConfirmed");
        } catch(Exception ignored){ call.reject("Gerätefreigabe erforderlich oder Autofill deaktiviert."); }
    }

    @ActivityCallback
    private void credentialConfirmed(PluginCall call,ActivityResult result) {
        if(call==null)return;
        if(result.getResultCode()!=Activity.RESULT_OK){
            call.reject("Gerätefreigabe abgebrochen.");
            return;
        }
        try{
            if(!ParolaAutofillCaptureStore.isEnabled(getContext()))throw new SecurityException("Autofill deaktiviert.");
            call.resolve(JSObject.fromJSONObject(ParolaAutofillCaptureStore.read(getContext(),call.getString("id"))));
        }catch(Exception ignored){call.reject("Eintrag nicht verfügbar.");}
    }

    @PluginMethod public void discardPending(PluginCall call) {
        try {
            ParolaAutofillCaptureStore.delete(getContext(),call.getString("id"));
            call.resolve();
        }catch(Exception ignored){call.reject("Eintrag nicht verfügbar.");}
    }
}

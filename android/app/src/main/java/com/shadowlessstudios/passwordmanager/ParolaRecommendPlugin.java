package com.shadowlessstudios.passwordmanager;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Shares only the public production listing, never vault contents. */
@CapacitorPlugin(name = "ParolaRecommend")
public class ParolaRecommendPlugin extends Plugin {
    private static final String APP_NAME = "Passwort Manager: Parola";
    private static final String PACKAGE = "com.shadowlessstudios.passwordmanager";
    private static final String STORE = "https://play.google.com/store/apps/details?id=" + PACKAGE;

    @PluginMethod
    public void share(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_SUBJECT, APP_NAME);
                send.putExtra(Intent.EXTRA_TEXT, APP_NAME + "\n" + STORE);
                getActivity().startActivity(Intent.createChooser(send, null));
                call.resolve();
            } catch (Exception ex) {
                call.reject("SHARE_UNAVAILABLE");
            }
        });
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent play = new Intent(Intent.ACTION_VIEW, Uri.parse(STORE));
                play.setPackage("com.android.vending");
                try {
                    getActivity().startActivity(play);
                } catch (ActivityNotFoundException ex) {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(STORE)));
                }
                call.resolve();
            } catch (Exception ex) {
                call.reject("STORE_UNAVAILABLE");
            }
        });
    }
}

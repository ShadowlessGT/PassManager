package com.shadowlessstudios.passwordmanager;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean screenWasOff = false;
    private boolean receiverRegistered = false;

    private final BroadcastReceiver screenOffReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                screenWasOff = true;
                notifyScreenOff();
            }
        }
    };

    private void notifyScreenOff() {
        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent("parola-screen-off");
        }
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ParolaBillingPlugin.class);
        registerPlugin(ParolaDocumentExportPlugin.class);
        super.onCreate(savedInstanceState);

        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenOffReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(screenOffReceiver, filter);
        }
        receiverRegistered = true;
    }

    @Override public void onResume() {
        super.onResume();
        if (screenWasOff) {
            screenWasOff = false;
            notifyScreenOff();
        }
    }

    @Override public void onDestroy() {
        if (receiverRegistered) {
            unregisterReceiver(screenOffReceiver);
            receiverRegistered = false;
        }
        super.onDestroy();
    }
}

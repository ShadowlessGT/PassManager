package com.shadowlessstudios.passwordmanager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ParolaBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

package com.shadowlessstudios.passwordmanager;

import android.app.Activity;
import com.android.billingclient.api.*;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Minimal Capacitor bridge for one non-consumable Google Play product.
 * Never determines whether a user is Ultra: Firebase verifies the purchase token.
 */
@CapacitorPlugin(name = "ParolaBilling")
public class ParolaBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    static final String SKU = "parola_ultra_lifetime";
    private BillingClient billing;
    private ProductDetails product;
    private String offerToken;

    @Override public void load() {
        billing = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private void connect(PluginCall call, Runnable action) {
        if (billing.isReady()) { action.run(); return; }
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingServiceDisconnected() {
                // Automatic reconnection; next action can retry.
            }
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    action.run();
                } else {
                    call.reject("Google Play Billing nicht verfügbar: " + result.getDebugMessage(),
                        "BILLING_UNAVAILABLE");
                }
            }
        });
    }

    @PluginMethod public void getProduct(PluginCall call) {
        connect(call, () -> {
            QueryProductDetailsParams query = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(SKU)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()))
                .build();
            billing.queryProductDetailsAsync(query, (result, details) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK ||
                    details.getProductDetailsList().isEmpty()) {
                    call.reject("Ultra-Produkt nicht verfügbar. Bitte Play-Store-Testtrack und Produkt prüfen.",
                        "PRODUCT_UNAVAILABLE");
                    return;
                }
                product = details.getProductDetailsList().get(0);
                List<ProductDetails.OneTimePurchaseOfferDetails> offers =
                    product.getOneTimePurchaseOfferDetailsList();
                if (offers == null || offers.isEmpty()) {
                    call.reject("Für dieses Konto ist derzeit kein Google-Play-Angebot verfügbar.",
                        "OFFER_UNAVAILABLE");
                    return;
                }
                ProductDetails.OneTimePurchaseOfferDetails offer = offers.get(0);
                offerToken = offer.getOfferToken();
                JSObject out = new JSObject();
                out.put("productId", SKU);
                out.put("title", product.getTitle());
                out.put("description", product.getDescription());
                out.put("price", offer.getFormattedPrice());
                call.resolve(out);
            });
        });
    }

    @PluginMethod public void purchase(PluginCall call) {
        String accountHash = call.getString("accountHash", "");
        if (accountHash == null || !accountHash.matches("[0-9a-f]{64}")) {
            call.reject("Für Ultra ist eine Firebase-Anmeldung erforderlich.", "AUTH_REQUIRED");
            return;
        }
        if (product == null || offerToken == null) {
            call.reject("Bitte zuerst die aktuelle Produktinformation abrufen.", "PRODUCT_REQUIRED");
            return;
        }
        connect(call, () -> {
            BillingFlowParams.ProductDetailsParams selected =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(product)
                    .setOfferToken(offerToken)
                    .build();
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(selected))
                .setObfuscatedAccountId(accountHash)
                .build();
            getActivity().runOnUiThread(() -> {
                BillingResult result = billing.launchBillingFlow(getActivity(), params);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Google Play Kaufdialog nicht gestartet: " + result.getDebugMessage(),
                        "PURCHASE_FAILED");
                } else {
                    JSObject started = new JSObject();
                    started.put("started", true);
                    call.resolve(started);
                }
            });
        });
    }

    @PluginMethod public void restore(PluginCall call) {
        connect(call, () -> {
            QueryPurchasesParams query = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP).build();
            billing.queryPurchasesAsync(query, (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Play-Käufe konnten nicht gelesen werden: " + result.getDebugMessage(),
                        "RESTORE_FAILED");
                    return;
                }
                JSArray restored = new JSArray();
                for (Purchase purchase : purchases) {
                    if (!purchase.getProducts().contains(SKU)) continue;
                    JSObject entry = new JSObject();
                    entry.put("productId", SKU);
                    entry.put("purchaseToken", purchase.getPurchaseToken());
                    entry.put("state", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED ?
                        "PURCHASED" : "PENDING");
                    restored.put(entry);
                }
                JSObject response = new JSObject();
                response.put("purchases", restored);
                call.resolve(response);
            });
        });
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        JSObject output = new JSObject();
        int code = result.getResponseCode();
        output.put("status", code == BillingClient.BillingResponseCode.OK ? "ok" :
            code == BillingClient.BillingResponseCode.USER_CANCELED ? "cancelled" : "error");
        if (code != BillingClient.BillingResponseCode.OK) {
            output.put("message", result.getDebugMessage());
        }
        JSArray items = new JSArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                if (!purchase.getProducts().contains(SKU)) continue;
                JSObject item = new JSObject();
                item.put("productId", SKU);
                item.put("purchaseToken", purchase.getPurchaseToken());
                item.put("state", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED ?
                    "PURCHASED" : "PENDING");
                items.put(item);
            }
        }
        output.put("purchases", items);
        notifyListeners("purchaseUpdated", output);
    }

    @Override protected void handleOnDestroy() {
        if (billing != null) billing.endConnection();
        super.handleOnDestroy();
    }
}

package io.synark.hisabify;

import android.app.Application;
import android.util.Log;

import com.google.firebase.FirebaseApp;
import com.revenuecat.purchases.LogLevel;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;
import io.synark.hisabify.BuildConfig;

public class HisabifyApp extends Application {
    private static final String TAG = "HisabifyApp";

    @Override
    public void onCreate() {
        super.onCreate();
        FirebaseApp.initializeApp(this);
        configureRevenueCat();
    }

    private void configureRevenueCat() {
        String apiKey = BuildConfig.REVENUECAT_API_KEY;
        if (apiKey == null || apiKey.isEmpty()) {
            Log.e(TAG, "REVENUECAT_API_KEY is not set in gradle.properties. In-app purchases will not work.");
            return;
        }

        if (BuildConfig.DEBUG) {
            Purchases.setLogLevel(LogLevel.DEBUG);
        }

        PurchasesConfiguration config = new PurchasesConfiguration.Builder(this, apiKey).build();
        Purchases.configure(config);
        Log.i(TAG, "RevenueCat configured successfully");
    }
}

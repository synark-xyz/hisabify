package io.synark.hisabify;

import android.os.Bundle;
import android.view.View;
import org.json.JSONObject;
import com.getcapacitor.BridgeActivity;
import io.synark.hisabify.BuildConfig;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setVerticalScrollBarEnabled(false);
        getBridge().getWebView().setHorizontalScrollBarEnabled(false);
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        getBridge().getWebView().setVerticalFadingEdgeEnabled(false);
        getBridge().getWebView().setHorizontalFadingEdgeEnabled(false);
        // Inject the native ENDPOINT build config into the web app so JS can access it.
        try {
            final String js = "window.__ENDPOINT__ = " + JSONObject.quote(BuildConfig.ENDPOINT) + ";";
            getBridge().getWebView().post(() -> {
                // evaluateJavascript must be called on the WebView's thread
                getBridge().getWebView().evaluateJavascript(js, null);
            });
        } catch (Exception ignored) {
            // If anything goes wrong, don't crash the app; JS can fallback to built-in defaults.
        }
    }
}

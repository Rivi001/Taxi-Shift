package com.riviproj.taxishift;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immerse();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (getBridge() == null) { finish(); return; }
                getBridge().getWebView().evaluateJavascript(
                    "window.taxiHandleBack ? window.taxiHandleBack() : 'exit'",
                    result -> { if ("\"exit\"".equals(result)) finish(); });
            }
        });
    }
    private void immerse() {
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        bars.hide(WindowInsetsCompat.Type.systemBars());
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immerse();
    }
    @Override public void onPause() {
        if (getBridge() != null) getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new Event('taxi-native-pause'))", null);
        super.onPause();
    }
}

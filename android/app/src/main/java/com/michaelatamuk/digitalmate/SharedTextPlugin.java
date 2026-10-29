package com.michaelatamuk.digitalmate;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Hands text received from Android's share sheet to the web layer. */
@CapacitorPlugin(name = "SharedText")
public class SharedTextPlugin extends Plugin {
    static final String PREFS = "digitalmate_share";
    static final String KEY = "shared_text";
    static final String TAB_KEY = "launch_tab";

    static void store(Context context, String text) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, text)
            .apply();
    }

    static void storeTab(Context context, String tab) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(TAB_KEY, tab)
            .apply();
    }

    @PluginMethod
    public void getSharedText(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String text = preferences.getString(KEY, "");
        preferences.edit().remove(KEY).apply();
        JSObject result = new JSObject();
        result.put("text", text == null ? "" : text);
        call.resolve(result);
    }

    @PluginMethod
    public void getLaunchTab(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String tab = preferences.getString(TAB_KEY, "");
        preferences.edit().remove(TAB_KEY).apply();
        JSObject result = new JSObject();
        result.put("tab", tab == null ? "" : tab);
        call.resolve(result);
    }
}

package com.michaelatamuk.digitalmate;

import android.content.Intent;
import android.service.quicksettings.TileService;

/** Quick Settings shortcut; the Android approximation of an atomic-service entry point. */
public class DigitalMateTileService extends TileService {
    @Override
    public void onClick() {
        super.onClick();
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivityAndCollapse(intent);
    }
}

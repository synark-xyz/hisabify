package io.synark.hisabify;

import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class HisabifyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "FCM";

    /**
     * Called when a new FCM registration token is generated (first install or token refresh).
     * Copy this token from Logcat to test push notifications in Firebase Console.
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token: " + token);
    }

    /**
     * Called when a push notification is received while the app is in the foreground.
     * Background/killed state is handled automatically by the FCM SDK.
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        String title = remoteMessage.getNotification() != null
            ? remoteMessage.getNotification().getTitle()
            : "(no title)";
        String body = remoteMessage.getNotification() != null
            ? remoteMessage.getNotification().getBody()
            : "(no body)";
        Log.d(TAG, "Message received — title: " + title + " | body: " + body);
    }
}

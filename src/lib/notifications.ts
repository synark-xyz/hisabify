
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === "granted") {
        new Notification(title, options);
    }
};

export const schedulePaymentReminder = (_reminder: { title: string, amount: number, due_date: string }) => {
    // Disabled intentionally: client-side setTimeout scheduling is unreliable across app restarts/background.
    // Reminder delivery should be handled by persistent system notifications or backend scheduling.
};

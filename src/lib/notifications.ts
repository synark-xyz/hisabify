
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

export const schedulePaymentReminder = (reminder: { title: string, amount: number, due_date: string }) => {
    // In a real app, this would be handled by a service worker or a backend cron job
    // For this demo, we can simulate it if the app is open
    const dueDate = new Date(reminder.due_date);
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();

    if (timeUntilDue > 0) {
        setTimeout(() => {
            sendNotification(`Payment Due: ${reminder.title}`, {
                body: `Your payment of ${reminder.amount} is due today!`,
                icon: "/pwa-192x192.png"
            });
        }, timeUntilDue);
    }
};

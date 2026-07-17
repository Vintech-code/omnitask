import * as Notifications from 'expo-notifications';

const LOG_PREFIX = '[OmniTaskNotificationProbe]';

function probeValue(url: string, key: string): string | null {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return null;
  }
}

export async function handleNotificationProbeUrl(url: string): Promise<boolean> {
  if (!url.startsWith('omnitask://notification-probe')) return false;
  const token = probeValue(url, 'token') || String(Date.now());
  const mode = probeValue(url, 'mode') || 'schedule';
  const permission = await Notifications.getPermissionsAsync();

  if (mode === 'permission-check') {
    console.info(`${LOG_PREFIX} ${token}:permission-${permission.status}`);
    return true;
  }

  if (permission.status !== 'granted') {
    console.info(`${LOG_PREFIX} ${token}:permission-${permission.status}`);
    return true;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `device_probe_${token}`,
    content: {
      title: `OmniTask notification probe ${token}`,
      body: 'Automated device delivery check',
      sound: true,
      data: { type: 'notification-probe', token },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  });
  console.info(`${LOG_PREFIX} ${token}:scheduled`);
  return true;
}

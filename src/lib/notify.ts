import { Alert, Platform } from 'react-native';

/** 跨平台消息弹窗(RN Web 的 Alert.alert 是空实现,需 fallback) */
export function showMessage(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/** 跨平台确认弹窗,确认后执行 onConfirm */
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

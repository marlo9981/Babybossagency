import * as Haptics from 'expo-haptics';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, Platform } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { children, style, onPress, ...rest } = props;
  return (
    <Pressable
      {...rest}
      style={style as any}
      onPress={(ev) => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(ev);
      }}>
      {children}
    </Pressable>
  );
}

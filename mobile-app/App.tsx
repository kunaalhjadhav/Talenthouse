import React from 'react';
import { Text, TextInput, Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// Global font/visibility fix: every <Text> and <TextInput> defaults to bold
// Times New Roman (iOS ships the real font; Android maps the closest match
// via 'serif', since Android has no built-in Times New Roman) with an
// explicit dark color. Set globally via defaultProps — not per-screen —
// specifically because the bug being fixed was text rendering invisibly on
// some screens, almost certainly from a missing explicit color. Centralizing
// it here means no individual screen can reintroduce the bug.
const FONT_FAMILY = Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' });
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = [{ fontFamily: FONT_FAMILY, fontWeight: 'bold', color: '#111827' }, (Text as any).defaultProps.style];
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = [{ fontFamily: FONT_FAMILY, fontWeight: 'bold', color: '#111827' }, (TextInput as any).defaultProps.style];
(TextInput as any).defaultProps.placeholderTextColor = (TextInput as any).defaultProps.placeholderTextColor || '#6b7280';

export default function App() {
  return (<AuthProvider><RootNavigator /></AuthProvider>);
}

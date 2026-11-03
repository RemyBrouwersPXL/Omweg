import { ActivityIndicator, Pressable, Text, TextInput, type TextInputProps } from 'react-native';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, disabled, loading, variant = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading;
  const base =
    variant === 'primary'
      ? 'bg-emerald-600 active:bg-emerald-700'
      : 'border border-zinc-600 active:bg-zinc-800';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`h-14 items-center justify-center rounded-xl px-6 ${base} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-lg font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <>
      <Text className="mb-2 text-sm font-medium text-zinc-400">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#71717a"
        className="mb-4 h-14 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-lg text-white"
        {...props}
      />
    </>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" className="mb-4 text-red-400">
      {message}
    </Text>
  );
}

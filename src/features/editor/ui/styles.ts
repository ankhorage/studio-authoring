import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  fields: { gap: 12 },
  membership: { gap: 8 },
  membershipRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  orderedListRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderedListAdd: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderedListInput: { flex: 1, minWidth: 160 },
  valueMapRow: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueMapKey: { minWidth: 140 },
  valueMapValue: { flex: 1, minWidth: 180 },
});

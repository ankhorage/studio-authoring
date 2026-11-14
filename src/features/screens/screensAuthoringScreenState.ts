/*** Describe the portable manifest facts needed to present one authored screen. */
export interface AuthoringScreenListItem {
  readonly id: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
}

/*** Report an invalid screen-list input without guessing which screen identity a host intended. */
export interface AuthoringScreenListDiagnostic {
  readonly code: 'duplicate-screen-id' | 'empty-screen-id';
  readonly message: string;
}

/*** Preserve the caller's ordered screens while rejecting ambiguous stable identifiers. */
export function deriveAuthoringScreenListState(screens: readonly AuthoringScreenListItem[]): {
  readonly diagnostic?: AuthoringScreenListDiagnostic;
} {
  const seen = new Set<string>();
  for (const screen of screens) {
    if (!screen.id) {
      return {
        diagnostic: {
          code: 'empty-screen-id',
          message: 'A screen is missing its stable id, so selection is unavailable.',
        },
      };
    }
    if (seen.has(screen.id)) {
      return {
        diagnostic: {
          code: 'duplicate-screen-id',
          message: `Multiple screens use the stable id '${screen.id}', so selection is unavailable.`,
        },
      };
    }
    seen.add(screen.id);
  }
  return {};
}

/*** Prefer authored titles while retaining a stable readable fallback for incomplete metadata. */
export function getAuthoringScreenLabel(screen: AuthoringScreenListItem): string {
  return (
    [screen.title, screen.name, screen.id]
      .map((value) => value?.trim())
      .find((value) => value !== undefined && value.length > 0) ?? screen.id
  );
}

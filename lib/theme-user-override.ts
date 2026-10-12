/** Set when the user picks a theme locally — blocks late server hydration from overwriting. */
let userHasOverriddenTheme = false;

export function markThemeUserOverride(): void {
  userHasOverriddenTheme = true;
}

export function hasThemeUserOverride(): boolean {
  return userHasOverriddenTheme;
}

export function resetThemeUserOverride(): void {
  userHasOverriddenTheme = false;
}

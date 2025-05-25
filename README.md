# Tailwind OKLCH to Figma Variables

## Background Context

This plugin was created to automate the process of converting Tailwind CSS color variables that use OKLCH color space into Figma color variables. It helps designers maintain consistency between their CSS design tokens and Figma design systems by automatically generating properly converted color variables.

## The Problem

When working with modern CSS color systems and Figma design systems, designers often face:

- **Color Space Mismatch**: OKLCH colors in CSS don't directly translate to Figma's RGB system
- **Manual Conversion**: Converting OKLCH values to hex colors is time-consuming and error-prone
- **Inconsistent Variables**: Maintaining parity between CSS tokens and Figma variables manually
- **Limited Tooling**: No direct way to import OKLCH-based design tokens into Figma

## Technical Constraints

**⚠️ Important: Figma Plugin JavaScript Environment Limitations**

Figma's plugin environment has limited JavaScript support and does **NOT** support many ES6+ features:

- ❌ **Template literals**: `` `${variable}` `` → Use `"string" + variable`
- ❌ **Spread operator**: `{...object}` → Use `Object.assign({}, object, newProps)`
- ❌ **Arrow functions in some contexts** → Use `function() {}`
- ❌ **Destructuring assignments** → Use explicit property access
- ❌ **Modern array methods** (in some cases) → Test thoroughly

**✅ Supported JavaScript:**

- Standard function declarations
- String concatenation with `+`
- `Object.assign()` for object merging
- Traditional for loops and basic array methods
- Standard object and array syntax

## Plugin Purpose

This tool helps designers:

### Color Token Management

- Convert OKLCH color values to accurate hex representations in Figma
- Maintain consistent naming conventions between CSS and Figma
- Handle both basic OKLCH and OKLCH with alpha channel
- Validate color values and provide clear error feedback

### Tailwind Integration

- Process only valid Tailwind color patterns (`--color-name-number`)
- Convert CSS variable names to Figma-compatible hierarchies
- Reject non-standard color variable patterns
- Maintain numerical ordering and color family grouping

### Collection Organization

- Choose existing variable collections or create new ones
- Auto-select the first available collection for convenience
- Organize variables with proper Figma naming hierarchy
- Handle variable updates and creation seamlessly

## How to Use

### Setup Required

1. Prepare your CSS file containing OKLCH Tailwind colors:

   ```css
   --color-red-25: oklch(0.986 0.007 17.38);
   --color-blue-500: oklch(0.627 0.258 29.23);
   --color-green-150: oklch(0.944 0.064 156.369);
   --color-purple-800: oklch(0.345 0.189 302.71 / 0.9);
   ```

2. Ensure your variables follow the strict Tailwind pattern:
   - ✅ Valid: `--color-red-25`, `--color-blue-500`
   - ❌ Invalid: `--color-neutral-dark-500`, `--primary-color`

### Plugin Workflow

1. **Select Collection**: Choose an existing collection or create a new one
2. **Upload CSS**: Select your CSS file containing OKLCH variables
3. **Review Preview**: Check which variables will be created, updated, or failed
4. **Apply Changes**: Confirm to generate the variables in Figma

### Expected Output

```
=== VARIABLE CREATION SUMMARY ===
Created: X new variables
Updated: Y existing variables
Failed: Z variables

=== EXAMPLE CONVERSIONS ===
--color-red-25: oklch(0.986 0.007 17.38) → color/red/25 (#FEF7F7)
--color-blue-500: oklch(0.627 0.258 29.23) → color/blue/500 (#0066CC)
--color-purple-800: oklch(0.345 0.189 302.71 / 0.9) → color/purple/800 (#6B21A8 @ 90%)
```

## Supported Patterns

### Variable Naming

- **Pattern**: `--color-{name}-{number}`
- **Examples**:
  - `--color-red-25` → `color/red/25`
  - `--color-blue-500` → `color/blue/500`
  - `--color-emerald-950` → `color/emerald/950`

### OKLCH Formats

- **Basic**: `oklch(L C H)` where:
  - L: Lightness (0-1 or 0-100%)
  - C: Chroma (0+, typically 0-0.5)
  - H: Hue (0-360 degrees)
- **With Alpha**: `oklch(L C H / A)` where:
  - A: Alpha (0-1 or 0-100%)

### Validation Rules

- Only processes variables matching exact Tailwind pattern
- Validates OKLCH parameter ranges and formats
- Handles percentage and decimal notation
- Provides specific error messages for invalid formats

## Files Structure

- `manifest.json` - Plugin configuration and metadata
- `code.js` - Core OKLCH parsing, color conversion, and variable creation logic
- `ui.html` - User interface for collection selection, CSS upload, and results
- `README.md` - This documentation

## Color Conversion Technical Details

### OKLCH to RGB Pipeline

1. **OKLCH → OKLab**: Convert polar coordinates to Cartesian
2. **OKLab → Linear RGB**: Apply standard conversion matrix
3. **Linear RGB → sRGB**: Apply gamma correction
4. **sRGB → Hex**: Convert to hexadecimal representation
5. **Clamping**: Ensure values stay within valid RGB ranges

### Accuracy Features

- Handles out-of-gamut colors gracefully
- Preserves alpha channel information
- Maintains color accuracy across different devices
- Uses industry-standard conversion matrices

## Success Criteria

- ✅ Accurately converts OKLCH colors to visually equivalent hex values
- ✅ Processes only valid Tailwind color variable patterns
- ✅ Creates properly organized variable hierarchies in Figma
- ✅ Handles alpha channel and transparency correctly
- ✅ Provides clear feedback on processing results
- ✅ Maintains performance with large CSS files

## Error Handling

### Common Error Cases

- **Invalid Pattern**: `--some-other-var` → "Does not match Tailwind pattern"
- **Malformed OKLCH**: `oklch(invalid)` → "Invalid OKLCH format"
- **Out of Range**: `oklch(2.0 0.5 180)` → "Lightness out of range: 2.0"
- **Missing Collection**: No collection selected → "No collection selected"

### Recovery Strategies

- Skip invalid variables and continue processing
- Provide detailed error messages with specific issues
- Allow retry with corrected files
- Maintain partial success when some variables fail

## Future Enhancements (Out of Scope)

- Support for other modern color spaces (LCH, Display P3)
- Batch processing of multiple CSS files
- Integration with design token systems
- Export/import functionality for color palettes
- Custom variable naming pattern support
- Real-time color preview during upload

## Dependencies

- Figma Plugin API for variable management and collections
- Custom OKLCH conversion algorithm (no external libraries)
- File reading capabilities for CSS processing
- DOM manipulation for user interface

## Browser Compatibility

- Designed for Figma's plugin environment
- Compatible with Figma Desktop and Web applications
- Uses only standard JavaScript features supported by Figma
- No external dependencies or modern JavaScript features

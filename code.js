// Note: This is a Figma plugin file.
// ES6+ features are not supported in Figma plugins.
// Keep all JavaScript code ES5 compatible.

// Tailwind OKLCH to Figma Variables Plugin

console.log("🚀 PLUGIN STARTED - Tailwind OKLCH to Figma Variables");

figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: "Tailwind OKLCH to Figma Variables",
  themeColors: true,
});

console.log("✅ UI SHOWN - Plugin window should be visible");

let selectedCollection = null;

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "get-collections":
      await handleGetCollections();
      break;
    case "set-collection":
      selectedCollection = msg.collection;
      figma.ui.postMessage({
        type: "collection-set",
        success: true,
      });
      break;
    case "parse-css":
      await handleCSSParsing(msg.cssContent);
      break;
    case "create-variables":
      await handleVariableCreation(msg.variablesToCreate);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    default:
      console.error("Unknown message type:", msg.type);
  }
};

async function handleGetCollections() {
  try {
    const localCollections = figma.variables.getLocalVariableCollections();

    const collections = localCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      defaultModeId: collection.defaultModeId,
    }));

    figma.ui.postMessage({
      type: "collections-loaded",
      collections: collections,
    });
  } catch (error) {
    console.error("Error getting collections:", error);
    figma.ui.postMessage({
      type: "collections-loaded",
      collections: [],
      error: error.message,
    });
  }
}

async function handleCSSParsing(cssContent) {
  try {
    console.log("Starting CSS parsing...");
    console.log("CSS content length:", cssContent.length);

    const oklchVariables = extractOklchVariables(cssContent);
    console.log("Extracted OKLCH variables:", oklchVariables.length);

    // Log first few for debugging
    if (oklchVariables.length > 0) {
      console.log("First variable:", oklchVariables[0]);
    }

    if (oklchVariables.length === 0) {
      figma.ui.postMessage({
        type: "parsing-complete",
        success: false,
        message:
          "No valid --color-name-number: oklch() variables found in the CSS file.",
      });
      return;
    }

    const validationResults = await validateVariables(oklchVariables);
    console.log("Validation results:", validationResults);

    figma.ui.postMessage({
      type: "parsing-complete",
      success: true,
      results: {
        totalFound: oklchVariables.length,
        valid: validationResults.valid,
        invalid: validationResults.invalid,
        details: validationResults.details,
      },
    });
  } catch (error) {
    console.error("Error parsing CSS:", error);
    figma.ui.postMessage({
      type: "parsing-complete",
      success: false,
      message: "Error parsing CSS: " + error.message,
    });
  }
}

async function handleVariableCreation(variablesToCreate) {
  try {
    console.log("Starting variable creation process...");
    console.log("Variables to create:", variablesToCreate);

    if (!selectedCollection) {
      throw new Error("No collection selected");
    }

    // Sort variables alphabetically
    variablesToCreate.sort(function (a, b) {
      return a.newVariable.localeCompare(b.newVariable);
    });

    const created = [];
    const updated = [];
    const failed = [];

    const localVariables = figma.variables.getLocalVariables();
    const variableMap = new Map();
    for (const variable of localVariables) {
      variableMap.set(variable.name, variable);
    }

    let collection;
    if (selectedCollection.isNew) {
      console.log("Creating new variable collection...");
      collection = figma.variables.createVariableCollection(
        selectedCollection.name
      );
    } else {
      collection = figma.variables.getVariableCollectionById(
        selectedCollection.id
      );
      if (!collection) {
        throw new Error("Selected collection not found");
      }
    }

    for (const item of variablesToCreate) {
      try {
        console.log("Processing item:", item);
        console.log("OKLCH values:", item.oklch);

        const rgbColor = oklchToRgb(
          item.oklch.l,
          item.oklch.c,
          item.oklch.h,
          item.oklch.a
        );
        console.log("RGB result:", rgbColor);

        if (!rgbColor) {
          console.log("Color conversion failed for:", item.newVariable);
          failed.push({
            variable: item.newVariable,
            oklch: item.oklchString,
            error: "Color conversion failed",
          });
          continue;
        }

        let newVariable = variableMap.get(item.newVariable);
        let wasUpdated = false;

        if (newVariable) {
          console.log("Updating existing variable: " + item.newVariable);
          wasUpdated = true;
        } else {
          console.log("Creating new variable: " + item.newVariable);
          newVariable = figma.variables.createVariable(
            item.newVariable,
            collection,
            "COLOR"
          );
          variableMap.set(item.newVariable, newVariable);
        }

        newVariable.setValueForMode(collection.defaultModeId, rgbColor);

        const resultItem = {
          variable: item.newVariable,
          oklch: item.oklchString,
          finalColor: rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b),
        };

        if (wasUpdated) {
          updated.push(resultItem);
        } else {
          created.push(resultItem);
        }
      } catch (error) {
        console.error(
          "Error creating variable " + item.newVariable + ":",
          error
        );
        console.error("Error details:", error.message, error.stack);
        failed.push({
          variable: item.newVariable,
          oklch: item.oklchString,
          error:
            typeof error === "string"
              ? error
              : error.message || "Unknown error",
        });
      }
    }

    console.log(
      "Summary: Created: " +
        created.length +
        ", Updated: " +
        updated.length +
        ", Failed: " +
        failed.length
    );

    figma.ui.postMessage({
      type: "creation-complete",
      success: true,
      results: {
        created,
        updated,
        failed,
        summary: {
          created: created.length,
          updated: updated.length,
          failed: failed.length,
          total: variablesToCreate.length,
        },
      },
    });
  } catch (error) {
    console.error("Error in variable creation:", error);
    figma.ui.postMessage({
      type: "creation-complete",
      success: false,
      message: "Error creating variables: " + error.message,
    });
  }
}

function extractOklchVariables(cssContent) {
  const oklchVariables = [];
  // Strict Tailwind pattern: --color-{name}-{number}: oklch(...)
  const oklchRegex = /--color-([a-z]+)-(\d+):\s*oklch\(([^)]+)\)/g;

  let match;
  while ((match = oklchRegex.exec(cssContent)) !== null) {
    const fullMatch = match[0];
    const colorName = match[1];
    const colorNumber = match[2];
    const oklchParams = match[3];

    const figmaVariableName = "color/" + colorName + "/" + colorNumber;

    // Parse OKLCH parameters
    const oklchValues = parseOklchParams(oklchParams);

    if (oklchValues) {
      oklchVariables.push({
        original: fullMatch,
        cssVariable: "--color-" + colorName + "-" + colorNumber,
        newVariable: figmaVariableName,
        colorName: colorName,
        colorNumber: colorNumber,
        oklchString: "oklch(" + oklchParams + ")",
        oklch: oklchValues,
      });
    } else {
      // Invalid OKLCH format - will be caught in validation
      oklchVariables.push({
        original: fullMatch,
        cssVariable: "--color-" + colorName + "-" + colorNumber,
        newVariable: figmaVariableName,
        colorName: colorName,
        colorNumber: colorNumber,
        oklchString: "oklch(" + oklchParams + ")",
        oklch: null,
        error: "Invalid OKLCH format",
      });
    }
  }

  return oklchVariables;
}

function parseOklchParams(params) {
  try {
    // Handle both oklch(L C H) and oklch(L C H / A) formats
    const trimmed = params.trim();

    // Check for alpha channel
    const hasAlpha = trimmed.indexOf("/") !== -1;
    let parts;
    let alpha = 1;

    if (hasAlpha) {
      const alphaSplit = trimmed.split("/");
      if (alphaSplit.length !== 2) return null;

      parts = alphaSplit[0].trim().split(/\s+/);
      const alphaStr = alphaSplit[1].trim();

      // Parse alpha (can be 0-1 or 0-100%)
      if (alphaStr.indexOf("%") !== -1) {
        alpha = parseFloat(alphaStr.replace("%", "")) / 100;
      } else {
        alpha = parseFloat(alphaStr);
      }

      if (isNaN(alpha) || alpha < 0 || alpha > 1) return null;
    } else {
      parts = trimmed.split(/\s+/);
    }

    if (parts.length !== 3) return null;

    // Parse L, C, H
    let l = parseFloat(parts[0]);
    let c = parseFloat(parts[1]);
    let h = parseFloat(parts[2]);

    if (isNaN(l) || isNaN(c) || isNaN(h)) return null;

    // Normalize lightness if given as percentage
    if (l > 1 && l <= 100) {
      l = l / 100;
    }

    // Validate ranges
    if (l < 0 || l > 1) return null;
    if (c < 0) return null;

    // Normalize hue to 0-360
    h = h % 360;
    if (h < 0) h += 360;

    return {
      l: l,
      c: c,
      h: h,
      a: alpha,
    };
  } catch (error) {
    return null;
  }
}

async function validateVariables(oklchVariables) {
  console.log("Validating variables:", oklchVariables.length);

  const valid = [];
  const invalid = [];
  const details = [];

  const localVariables = figma.variables.getLocalVariables();
  const variableMap = new Map();
  for (const variable of localVariables) {
    variableMap.set(variable.name, variable);
  }

  for (const oklchVar of oklchVariables) {
    console.log("Validating variable:", oklchVar);

    if (oklchVar.error || !oklchVar.oklch) {
      console.log("Variable has error:", oklchVar.error);
      invalid.push({
        variable: oklchVar.newVariable,
        oklch: oklchVar.oklchString,
        error: oklchVar.error || "Invalid OKLCH format",
      });

      details.push({
        status: "invalid",
        variable: oklchVar.newVariable,
        message: oklchVar.error || "Invalid OKLCH format",
      });
    } else {
      const exists = variableMap.has(oklchVar.newVariable);
      console.log("Variable exists:", exists, "for", oklchVar.newVariable);

      valid.push({
        variable: oklchVar.newVariable,
        oklch: oklchVar.oklch,
        oklchString: oklchVar.oklchString,
        newVariable: oklchVar.newVariable,
        exists: exists,
      });

      details.push({
        status: "valid",
        variable: oklchVar.newVariable,
        message: exists
          ? "Will update existing variable"
          : "Will create new variable",
      });
    }
  }

  console.log(
    "Validation complete. Valid:",
    valid.length,
    "Invalid:",
    invalid.length
  );
  return {
    valid: valid,
    invalid: invalid,
    details: details,
  };
}

function oklchToRgb(l, c, h, a) {
  try {
    console.log("Converting OKLCH to RGB:", { l: l, c: c, h: h, a: a });

    // Validate inputs
    if (
      typeof l !== "number" ||
      typeof c !== "number" ||
      typeof h !== "number"
    ) {
      console.error("Invalid OKLCH inputs - not numbers:", {
        l: l,
        c: c,
        h: h,
      });
      return null;
    }

    if (isNaN(l) || isNaN(c) || isNaN(h)) {
      console.error("Invalid OKLCH inputs - NaN values:", { l: l, c: c, h: h });
      return null;
    }

    // Convert OKLCH to OKLab
    const hRad = (h * Math.PI) / 180;
    const okLabA = c * Math.cos(hRad);
    const okLabB = c * Math.sin(hRad);

    console.log("OKLab values:", { l: l, a: okLabA, b: okLabB });

    // OKLab to Linear RGB using the standard matrix
    const lms_l = l + 0.3963377774 * okLabA + 0.2158037573 * okLabB;
    const lms_m = l - 0.1055613458 * okLabA - 0.0638541728 * okLabB;
    const lms_s = l - 0.0894841775 * okLabA - 1.291485548 * okLabB;

    const lms_l_cubed = lms_l * lms_l * lms_l;
    const lms_m_cubed = lms_m * lms_m * lms_m;
    const lms_s_cubed = lms_s * lms_s * lms_s;

    const linear_r =
      +4.0767416621 * lms_l_cubed -
      3.3077115913 * lms_m_cubed +
      0.2309699292 * lms_s_cubed;
    const linear_g =
      -1.2684380046 * lms_l_cubed +
      2.6097574011 * lms_m_cubed -
      0.3413193965 * lms_s_cubed;
    const linear_b =
      -0.0041960863 * lms_l_cubed -
      0.7034186147 * lms_m_cubed +
      1.707614701 * lms_s_cubed;

    console.log("Linear RGB:", { r: linear_r, g: linear_g, b: linear_b });

    // Linear RGB to sRGB
    const srgb_r = linearToSrgb(linear_r);
    const srgb_g = linearToSrgb(linear_g);
    const srgb_b = linearToSrgb(linear_b);

    // Clamp values to 0-1 range
    const r = Math.max(0, Math.min(1, srgb_r));
    const g = Math.max(0, Math.min(1, srgb_g));
    const b = Math.max(0, Math.min(1, srgb_b));

    const result = {
      r: r,
      g: g,
      b: b,
      a: a || 1,
    };
    console.log("Final RGB result:", result);

    return result;
  } catch (error) {
    console.error("OKLCH conversion error:", error);
    console.error("Input values were:", { l: l, c: c, h: h, a: a });
    return null;
  }
}

function linearToSrgb(linear) {
  if (linear <= 0.0031308) {
    return 12.92 * linear;
  } else {
    return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  }
}

function rgbToHex(r, g, b) {
  const toHex = function (component) {
    const hex = Math.round(component * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return "#" + toHex(r) + toHex(g) + toHex(b);
}

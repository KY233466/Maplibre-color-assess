#!/usr/bin/env node

import layerPaintToZoomLevelColors from "./layerPaintToZoomLevelColors.js";
import extractStyle from "./extractStyle.js";
import getNonComplimentPairsByType from "./checkContrast.js";
import fs from "fs";
import path from "path";

const [mode, filePath, outputPath] = process.argv.slice(2);

if (!filePath) {
  console.error("Please provide a path to the JSON file");
  process.exit(1);
}

if (mode !== "analysis") {
  console.error("Please provide a correct mode name");
  process.exit(1);
}

const zoomLevelColorsArray = [];
const colorBlindTypes = ["normal", "deuteranopia", "protanopia", "tritanopia"];

extractStyle(filePath)
  .then((data) => {

    console.log(data);
    Object.keys(data).forEach((key) => {
      data[key].forEach((item) => {
        const zoomLevelColors = layerPaintToZoomLevelColors(item, 2, 22);
        if (zoomLevelColors) {
          zoomLevelColorsArray.push(zoomLevelColors);
        }
      });
    });

    const colorsInEachZoomLevel =
      extractColorsInEachZoomLevel(zoomLevelColorsArray);
    const zoomLevelColorMap = extractZoomLevelColorMap(colorsInEachZoomLevel);
    const uniqueColors = getUniqueColors(colorsInEachZoomLevel);

    const nonCompliantPairsByType = getNonComplimentPairsByType(
      colorBlindTypes,
      uniqueColors
    );

    outPutAnalysis(nonCompliantPairsByType, zoomLevelColorMap);
  })
  .catch((error) => {
    console.error("Error reading file:", error);
  });

function outPutAnalysis(nonCompliantPairsByType, zoomLevelColorMap) {
  const outputMessagesToFileByType = [];

  nonCompliantPairsByType.map((pairsArray) => {
    if (Object.keys(pairsArray[1]).length === 0) {
      console.log('***', [ pairsArray[0] ], 'mode: everything_looks good! ***');
    } else {
      if (outputPath) {
        outputMessagesToFileByType.push(
          outputNoneCompliantPairs(pairsArray, zoomLevelColorMap).join("")
        );
      } else {
        console.log("------", pairsArray[0], "------");
        writeResultToTerminal(pairsArray[1], zoomLevelColorMap);
        console.log("\n");
      }
    }
  });

  if (outputPath) {
    writeResultToFile(outputMessagesToFileByType.join(""));
  }
}

function writeResultToTerminal(nonCompliantPairs, zoomLevelColorMap) {
  Object.keys(nonCompliantPairs).forEach((key) => {
    const pairs = nonCompliantPairs[key];
    pairs.map((p) => {
      const color1 = p[0];
      const color2 = p[1];

      console.log(
        `Zoom ${key}`,
        zoomLevelColorMap[key][color1],
        [color1],
        "and",
        zoomLevelColorMap[key][color2],
        [color2],
        "are too similar"
      );
    });
  });
}

function writeResultToFile(outputMessages) {
  fs.writeFile(path.resolve(outputPath), outputMessages, "utf8", (writeErr) => {
    if (writeErr) {
      console.error("Error writing to output file:", writeErr);
      process.exit(1);
    }
    console.log("Result has been written to", outputPath);
  });
}

function outputNoneCompliantPairs(nonCompliantPairs, zoomLevelColorMap) {
  let outputMessages = [`------ ${nonCompliantPairs[0]} ------\n`];
  const pairsArray = nonCompliantPairs[1];

  Object.keys(pairsArray).forEach((key) => {
    const pairs = pairsArray[key];
    pairs.map((p) => {
      const color1 = p[0];
      const color2 = p[1];

      outputMessages.push(
        `Zoom ${key} [ "${zoomLevelColorMap[key][color1]}" ] ${color1} and [ "${zoomLevelColorMap[key][color2]}" ] ${color2} are too similar\n`
      );
    });
  });

  outputMessages.push("\n");

  return outputMessages;
}

/*

Output:
{
  '0': {
    landuse_school: '#FFC7E2',
    landuse_errr: '#ff0000',
    landuse_hospital: '#FFDDDD'
  },
  '1': {
    landuse_school: '#FFC7E2',
    landuse_errr: '#ff0000',
    landuse_hospital: '#FFDDDD'
  },
  '2': {
    landuse_school: '#FFC7E2',
    landuse_errr: '#ff0000',
    landuse_hospital: '#FFDDDD'
  }
}
*/
function extractColorsInEachZoomLevel(layers) {
  const result = {};

  layers.forEach(([layerName, zoomLevels]) => {
    Object.keys(zoomLevels).forEach((zoomLevel) => {
      if (!result[zoomLevel]) {
        result[zoomLevel] = {};
      }
      result[zoomLevel][layerName] = zoomLevels[zoomLevel];
    });
  });

  return result;
}

/*
Output:
{
  '2': {
    'rgba(169,90,161,0.49)': [ 'Place of worship' ],
    'rgba(169,90,161,1)': [ 'Moor or heathland' ]
  },
  '3': {
    'rgba(169,90,161,0.49)': [ 'Place of worship' ],
    'rgba(169,90,161,1)': [ 'Moor or heathland' ]
  },
  '4': {
    'rgba(169,90,161,0.49)': [ 'Place of worship' ],
    'rgba(169,90,161,1)': [ 'Moor or heathland' ]
  }
}
*/
function extractZoomLevelColorMap(input) {
  const result = {};

  for (const [zoom, layers] of Object.entries(input)) {
    const colorMap = new Map();

    for (const [layer, color] of Object.entries(layers)) {
      if (!colorMap.has(color)) {
        colorMap.set(color, []);
      }
      colorMap.get(color).push(layer);
    }

    result[parseInt(zoom, 10)] = Object.fromEntries(colorMap);
  }

  return result;
}

/*
Output:
[
  [ 0, [ '#FFC7E2', '#ff0000', '#FFDDDD' ] ],
  [ 1, [ '#FFC7E2', '#ff0000', '#FFDDDD' ] ],
  [ 2, [ '#FFC7E2', '#ff0000', '#FFDDDD' ] ],
]
*/
function getUniqueColors(data) {
  return Object.entries(data).map(([zoomLevel, colorsObj]) => {
    const uniqueColors = [...new Set(Object.values(colorsObj))];

    return [parseInt(zoomLevel), uniqueColors];
  });
}

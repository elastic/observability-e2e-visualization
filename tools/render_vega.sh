#!/bin/bash

error_count=0

# Function to process a single Vega file
process_file() {
  local file="$1"
  echo "Processing $file..."

  # Check if the file exists and is readable
  if [ ! -r "$file" ]; then
    echo "Error: Cannot read $file. Skipping."
    return 1
  fi

  # Render the Vega specification to a PNG file
  output_file="${file%.vg.json}.png"
  vg2png "$file" "$output_file"
  if [ $? -ne 0 ]; then
    echo "Rendering failed for $file. Please check the specification."
    return 1
  fi

  echo "Rendering completed successfully for $file. Output saved to $output_file."
  return 0
}

# Check if a specific file was provided as an argument
if [ $# -ge 1 ]; then
  # Process only the specified file
  process_file "$1"
  if [ $? -ne 0 ]; then
    error_count=$((error_count + 1))
  fi
else
  # No file specified, process all Vega files in the current directory
  for file in *.vg.json; do
    process_file "$file"
    if [ $? -ne 0 ]; then
      error_count=$((error_count + 1))
    fi
  done
fi

if [ $error_count -ne 0 ]; then
  echo -e "\nSummary: $error_count file(s) failed to render."
else
  echo -e "\nAll files rendered successfully."
fi

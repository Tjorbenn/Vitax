#!/bin/bash

# --- Default Values ---
ORIENTATION="TB"
MAX_DEPTH_ARGS=() # Store as array
SHOW_HIDDEN=false
OUTPUT_FILE=""
FILE_TYPE="svg"
TARGET_DIR=""

# --- Usage Function ---
usage() {
  echo "Usage: $0 <directory> [options]"
  echo "Generates a directory structure graph using find and graphviz (dot)."
  echo ""
  echo "Arguments:"
  echo "  <directory>     The target directory to visualize."
  echo ""
  echo "Options:"
  echo "  -o <file>       Output file name (without extension). Default: <directory>_Graph"
  echo "  -f <type>       File type (e.g., svg, png, jpg, pdf). Default: svg"
  echo "  -d <depth>      Max depth to visualize (passes -maxdepth to find)."
  echo "  -t <orient>     Graph orientation (TB, BT, LR, RL). Default: TB"
  echo "  -a, --all       Show hidden directories (those starting with . or __)"
  echo "  -h, --help      Show this help message"
  exit 1
}

# --- Argument Parsing ---
# Manual loop to handle long options and separate flags from positional args
while (("$#")); do
  case "$1" in
  -h | --help)
    usage
    ;;
  -a | --all)
    SHOW_HIDDEN=true
    shift
    ;;
  -o)
    if [ -n "$2" ]; then
      OUTPUT_FILE="$2"
      shift 2
    else
      echo "Error: -o requires an argument." >&2
      usage
    fi
    ;;
  -f)
    if [ -n "$2" ]; then
      FILE_TYPE="$2"
      shift 2
    else
      echo "Error: -f requires an argument." >&2
      usage
    fi
    ;;
  -d)
    if [ -n "$2" ]; then
      # Add -maxdepth and its value as separate elements to the array
      MAX_DEPTH_ARGS=("-maxdepth" "$2")
      shift 2
    else
      echo "Error: -d requires an argument." >&2
      usage
    fi
    ;;
  -t)
    if [ -n "$2" ]; then
      ORIENTATION="$2"
      shift 2
    else
      echo "Error: -t requires an argument." >&2
      usage
    fi
    ;;
  -*)
    echo "Error: Unknown option $1" >&2
    usage
    ;;
  *)
    # This is the positional argument
    if [ -z "$TARGET_DIR" ]; then
      TARGET_DIR="$1"
      shift
    else
      echo "Error: Too many arguments. Target directory is '$TARGET_DIR'." >&2
      usage
    fi
    ;;
  esac
done

# --- Validation ---
if [ -z "$TARGET_DIR" ]; then
  echo "Error: Target directory is required." >&2
  usage
fi

TARGET_DIR=${TARGET_DIR%/}

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: '$TARGET_DIR' is not a directory." >&2
  exit 1
fi

if ! command -v dot &>/dev/null; then
  echo "Error: 'dot' (from Graphviz) is not found in your PATH." >&2
  echo "Please install Graphviz. (e.g., 'sudo dnf install graphviz' on Fedora)" >&2
  exit 1
fi

# --- Set Defaults ---
if [ -z "$OUTPUT_FILE" ]; then
  # Get basename of target dir
  DIR_BASENAME=$(basename "$TARGET_DIR")
  OUTPUT_FILE="${DIR_BASENAME}_Graph"
fi

FINAL_OUTPUT_FILE="${OUTPUT_FILE}.${FILE_TYPE}"

# --- AWK Script to Generate DOT Syntax ---
# This script is passed to awk. It reads paths from stdin.
# It's written in C-style awk for clarity.
read -r -d '' DOT_GENERATOR_AWK <<'EOF'
BEGIN {
    # Start the graph
    print "digraph G {"
    printf "  graph [rankdir=%s, ranksep=8, nodesep=0.2, splines=polyline, overlap=scale];\n", orientation
    print "  node [shape=folder, style=filled, fillcolor=\"#006c66\", fontname=\"Libertinus Sans\", fontsize=30, fontcolor=\"#ffffff\"];"
    print " edge [color=\"#777777\", arrowsize=2];"
}

{
    # For each path given by find:
    path = $0

    # Get basename for the node label
    n = split(path, parts, "/")
    label = toupper(substr(parts[n], 1, 1)) substr(parts[n], 2)

    # Find the parent path
    parent = ""
    if (index(path, "/")) {
        # Find the index of the last "/"
        last_slash = 0
        for (i=1; i<=length(path); i++) {
            if (substr(path, i, 1) == "/") {
                last_slash = i
            }
        }
        
        if (last_slash > 0) {
            parent = substr(path, 1, last_slash - 1)
        }
    }
    if (parent != "") {
        # Children nodes get the 'group' attribute
        printf "  \"%s\" [label=\"%s\", group=\"%s\"];\n", path, label, parent
    } else {
        # Root node does not need a group
        printf "  \"%s\" [label=\"%s\"];\n", path, label
    }

    # 2. Define the edge from parent to child
    if (parent != "") {
        printf "  \"%s\" -> \"%s\";\n", parent, path
    }
}

END {
    # Close the graph
    print "}"
}
EOF

# --- Main Execution Pipeline ---

echo "Scanning directory: $TARGET_DIR"

# 1. Base `find` command
#    We find all directories.
#    The "${MAX_DEPTH_ARGS[@]}" part expands to "-maxdepth N" if set, or nothing if empty.
find_cmd_output=$(find "$TARGET_DIR" -type d "${MAX_DEPTH_ARGS[@]}")

# 2. Filter command (if needed)
filtered_output=""
if [ "$SHOW_HIDDEN" = false ]; then
  echo "Filtering hidden directories..."
  # Use awk to filter.
  # $0 == root: Always include the root directory itself.
  # $NF !~ /^(\.|__)/: Include lines where the basename (last field)
  #                   does not start with "." or "__".
  filtered_output=$(echo "$find_cmd_output" | awk -F/ -v root="$TARGET_DIR" '$0 == root || $NF !~ /^(\.|__)/')
else
  echo "Including all directories..."
  filtered_output="$find_cmd_output"
fi

# 3. DOT generator and final render
echo "Generating DOT syntax..."
dot_output=$(echo "$filtered_output" | awk -v orientation="$ORIENTATION" "$DOT_GENERATOR_AWK")

echo "Rendering graph with 'dot' to $FINAL_OUTPUT_FILE..."
# 4. Pipe the DOT syntax string directly to the `dot` command
echo "$dot_output" | dot -T"$FILE_TYPE" -o "$FINAL_OUTPUT_FILE"

echo "✅ Graph generation complete!"

# In-blender entry: blender -b --factory-startup -P main.py -- --id <asset_id>
# Reads manifest.json next to this file, builds the asset, exports GLB.
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import common as C  # noqa: E402
import builders  # noqa: E402
import character  # noqa: E402


def arg(flag):
    argv = sys.argv
    i = argv.index("--") if "--" in argv else len(argv)
    return argv[argv.index(flag) + 1]


def main():
    asset_id = arg("--id")
    out_root = os.environ.get("MCL_OUT", os.path.join(HERE, "..", "..", "game", "assets", "models"))
    with open(os.path.join(HERE, "manifest.json")) as fh:
        manifest = json.load(fh)
    spec = next(a for a in manifest["assets"] if a["id"] == asset_id)
    C.clear()
    if spec["builder"] == "character":
        rig = character.build(C, spec)
        obj = C.finish(rig, spec["id"])
        mesh = rig.children[0]
        C.export([mesh, rig], os.path.join(out_root, spec["out"]))
    else:
        obj = getattr(builders, spec["builder"])(C, spec)
        C.export(obj, os.path.join(out_root, spec["out"]))
    print("EXPORTED", asset_id, os.path.join(out_root, spec["out"]))


main()

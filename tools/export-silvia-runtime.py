"""Blender: derive runtime LODs from the exact approved editable source.
Run: blender -b --python tools/export-silvia-runtime.py -- REPOSITORY_ROOT
The approved archive is immutable; no procedural redesign takes place here.
"""
import bpy, sys, zipfile, tempfile, pathlib, json, base64
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
archive=root/'design/silvia-approved/Silvia_Blueprint_Model_Files.zip'
out=root/'Drift Drive/models';out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as directory:
    with zipfile.ZipFile(archive) as z:
        z.extract('Silvia_Blueprint_Review.blend',directory)
    original=pathlib.Path(directory)/'Silvia_Blueprint_Review.blend'
    stats={}
    for level,ratio in [('detail',.32),('laptop',.12)]:
        bpy.ops.wm.open_mainfile(filepath=str(original))
        objects=[o for o in bpy.data.objects if o.type=='MESH']
        groups={}
        for o in objects:
            assembly=o.get('assembly','Body');name=o.name.lower()
            category='body'
            if assembly!='Body':category='caliper' if 'caliper' in name else 'spokes' if ('spoke' in name or 'lug' in name or 'centre cap' in name) else 'wheel'
            elif 'wing' in name:category='spoiler'
            elif any(s in name for s in ['dashboard','seat','steering','console','cabin floor']):category='interior'
            elif 'plate' in name and (o.matrix_world.translation.x < -1.8):category='frontplate'
            material=o.data.materials[0].name if o.data.materials else ''
            groups.setdefault((assembly,category,material),[]).append(o)
        for (assembly,category,material),meshes in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in meshes:o.select_set(True)
            bpy.context.view_layer.objects.active=meshes[0]
            if len(meshes)>1:bpy.ops.object.join()
            obj=bpy.context.object;obj.name=assembly+' | '+category+' | '+material
            if len(obj.data.polygons)>120:
                mod=obj.modifiers.new('Runtime simplification','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
                bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.select_all(action='DESELECT')
        for o in bpy.data.objects:
            if o.type=='MESH':o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(out/('silvia-'+level+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
        meshes=[o for o in bpy.data.objects if o.type=='MESH']
        stats[level]={'meshes':len(meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)}
    (out/'silvia-runtime.json').write_text(json.dumps({'source_glb_sha256':'2e41b2ab6b324e787a83a0ec0a2d2ad75aac69620351aada0a0e6ee79c21050a','levels':stats},indent=2)+'\n')
    print('Runtime LODs:',stats)

(out/'silvia-file.js').write_text('// Direct-file compatibility: approved laptop LOD, not a separate model.\nwindow.DD_SILVIA_FILE='+json.dumps(base64.b64encode((out/'silvia-laptop.glb').read_bytes()).decode())+';\n')

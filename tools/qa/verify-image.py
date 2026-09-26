"""Inspect the built image without passing runtime secrets to its container."""
import io,json,re,subprocess,sys,tempfile,zipfile,tarfile
from pathlib import Path
image=sys.argv[1] if len(sys.argv)>1 else 'aulas-demo:local'
run=lambda args:subprocess.check_output(args,stderr=subprocess.DEVNULL)
private=[]
for line in Path('backend/.env').read_text().splitlines():
    if '=' not in line or line.startswith('#'):continue
    key,value=line.split('=',1)
    if re.search(r'PASSWORD|SECRET|TOKEN|SERVICE_ROLE|DB_URL',key) and len(value)>=8:
        private.append(value.replace('\\\\','\\').encode())
metadata=run(['docker','image','inspect',image]);history=run(['docker','history','--no-trunc',image])
assert all(secret not in metadata+history for secret in private),'Private value in image metadata/history'
config=json.loads(metadata)[0]['Config'];assert config['User'] not in ('','0','root'),'Image must default to an unprivileged user'
container=run(['docker','create','--entrypoint','true',image]).decode().strip()
files=0
try:
    with tempfile.TemporaryDirectory(prefix='aulas-image-check-') as directory:
        saved=Path(directory)/'image.tar'
        subprocess.run(['docker','image','save','-o',str(saved),image],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        layer_files=0
        with tarfile.open(saved) as outer:
            manifest=json.load(outer.extractfile('manifest.json'))
            for layer in manifest[0]['Layers']:
                with tarfile.open(fileobj=outer.extractfile(layer),mode='r|*') as archive:
                    for member in archive:
                        if not member.isfile():continue
                        assert not re.search(r'(^|/)\.env($|\.)',member.name),'Environment file embedded in runtime layer'
                        stream=archive.extractfile(member);tail=b'';layer_files+=1
                        while chunk:=stream.read(1024*1024):
                            payload=tail+chunk
                            assert all(secret not in payload for secret in private),'Private value in runtime layer'
                            tail=payload[-max([len(s) for s in private]+[1]):]
        jar=Path(directory)/'aulas.jar' 
        subprocess.run(['docker','cp',container+':/app/aulas.jar',str(jar)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        def scan(data):
            global files
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for info in archive.infolist():
                    if info.is_dir():continue
                    assert not re.search(r'(^|/)\.env($|\.)',info.filename),'Environment file embedded in JAR'
                    payload=archive.read(info);files+=1
                    assert all(secret not in payload for secret in private),'Private value in packaged content'
                    if info.filename.endswith('.jar'):scan(payload)
        scan(jar.read_bytes())
        with zipfile.ZipFile(jar) as archive:
            html=archive.read('BOOT-INF/classes/static/index.html')
            assert b'/assets/' in html and b'/src/main.tsx' not in html
            assert not any('/src/test/' in n for n in archive.namelist())
finally:run(['docker','rm',container])
print(f'Image checked: {files} packaged files and {layer_files} runtime layer files; compiled React; non-root default; no inspected local private values or .env files.')

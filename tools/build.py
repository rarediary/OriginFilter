"""Reproducible browser packages; Python standard library only."""
import json
import shutil
import zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
VERSION = '0.8.0'
MATCHES = ['https://*.x.com/*', 'https://*.twitter.com/*', 'https://*.facebook.com/*', 'https://*.youtube.com/*']
def manifest(browser):
    m = {'manifest_version':3,'name':'OriginFilter','version':VERSION,
         'description':'Local English-language and evidence-based account-country filters for X, Facebook and YouTube. Country coverage is limited.',
         'permissions':['storage'], 'host_permissions':MATCHES,
         'icons':{'16':'icons/icon-16.png','32':'icons/icon-32.png','48':'icons/icon-48.png','128':'icons/icon-128.png'},
         'action':{'default_popup':'popup.html','default_icon':{'16':'icons/icon-16.png','32':'icons/icon-32.png','48':'icons/icon-48.png','128':'icons/icon-128.png'}},
         'content_scripts':[{'matches':MATCHES,'js':['core.js','adapters.js','content.js'],'css':['content.css'],'run_at':'document_start'}]}
    if browser=='firefox':
        m['background']={'scripts':['core.js','ads.js','background.js']}
        m['browser_specific_settings']={'gecko':{'id':'originfilter@rarediary.dev','strict_min_version':'140.0','data_collection_permissions':{'required':['none'],'optional':['websiteContent']}}}
    else:
        m['background']={'service_worker':'background.js'}
        m['minimum_chrome_version']='112'
    return m

def build():
    out=ROOT/'dist';out.mkdir(exist_ok=True)
    for browser in ('firefox','chrome'):
        dest=ROOT/browser
        if dest.exists():shutil.rmtree(dest)
        shutil.copytree(ROOT/'extension',dest)
        (dest/'manifest.json').write_text(json.dumps(manifest(browser),indent=2)+'\n')
        with zipfile.ZipFile(out/f'OriginFilter-{browser}-{VERSION}.zip','w',zipfile.ZIP_DEFLATED) as z:
            for p in sorted(dest.rglob('*')):
                if p.is_file():z.write(p,p.relative_to(dest))
    print(f'Built Firefox and Chrome {VERSION} in {out}')
if __name__=='__main__':build()

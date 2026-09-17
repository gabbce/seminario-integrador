"""Genera diagramas PNG y exporta README.md a PDF. Ver herramientas/README.md."""
from pathlib import Path
import re
from html import escape
from PIL import Image as Raster, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Preformatted
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT

ROOT = Path(__file__).resolve().parents[1]
FONT = Path('/usr/share/fonts/truetype/dejavu')
GREEN='#194D3A'; INK='#24352B'; MUTED='#59645D'; CREAM='#F5F1E9'; CLAY='#F4E4DC'; SAGE='#E8EEE4'
def font(size,bold=False): return ImageFont.truetype(str(FONT/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
def diagram(name,size):
    im=Raster.new('RGB',size,CREAM);return im,ImageDraw.Draw(im)
def box(d,xy,title,lines,fill=SAGE):
    x,y,x2,y2=xy;d.rounded_rectangle(xy,18,fill=fill,outline='#D8DCD5',width=2)
    d.text((x+22,y+18),title,font=font(25,True),fill=GREEN)
    for i,line in enumerate(lines):d.text((x+22,y+60+i*31),line,font=font(22),fill=INK)
def arrow(d,a,b):
    d.line([a,b],fill=GREEN,width=4)
    x,y=b;dx,dy=b[0]-a[0],b[1]-a[1]
    if abs(dx)>abs(dy):d.polygon([(x,y),(x-(12 if dx>0 else -12),y-7),(x-(12 if dx>0 else -12),y+7)],fill=GREEN)
    else:d.polygon([(x,y),(x-7,y-12),(x+7,y-12)],fill=GREEN)
def save(im,name):im.save(ROOT/'imagenes'/name)

im,d=diagram('entregas',(1200,460))
for i,(t,ls) in enumerate([('I-01 · Acceso',['Login y permisos','Aceptada']),('I-02 · Administración',['Aulas, cuentas y calendario','Aceptada']),('I-03 · Periódicas',['Disponibilidad y guardado','Aceptada'])]):
    x=15+i*400;box(d,(x,15,x+370,200),t,ls)
for i,(t,ls) in enumerate([('I-04 · Operaciones',['Editar, cancelar, reprogramar','Pendiente']),('I-05 · Información',['Consultas e indicadores','Pendiente']),('I-06 · Presentación',['Empaquetado y QA integral','Pendiente'])]):
    x=15+i*400;box(d,(x,245,x+370,440),t,ls,CLAY)
save(im,'entregas.png')
im,d=diagram('flujo',(1200,700))
box(d,(20,20,365,185),'1 · Criterios',['Curso, docente, alumnos','Período, días y horarios'])
box(d,(420,20,780,185),'2 · Calcular fechas',['Omitir feriados y receso','Respetar exclusiones'])
box(d,(835,20,1180,185),'3 · Buscar aulas',['Capacidad y recursos','Todo el período'])
arrow(d,(365,105),(420,105));arrow(d,(780,105),(835,105));arrow(d,(1005,185),(1005,245))
box(d,(835,245,1180,400),'¿Hay aula libre?',['Para cada patrón','semanal'],fill='white')
arrow(d,(835,315),(725,315));d.text((755,280),'Sí',font=font(22,True),fill=GREEN)
box(d,(310,245,725,400),'4 · Elegir y revisar',['Aula fija por día semanal','Todavía no ocupa el aula'])
arrow(d,(510,400),(510,475));box(d,(310,475,725,650),'5 · Confirmar',['Java vuelve a validar','Todo se guarda o nada'])
arrow(d,(1005,400),(1005,475));d.text((1018,427),'No',font=font(22,True),fill=GREEN)
box(d,(805,475,1180,650),'Ver alternativas',['Contactar responsables','Ajustar y volver a buscar'],CLAY)
d.text((30,530),'Sin sobre-reservas.',font=font(22,True),fill=GREEN)
d.text((30,563),'Sin aulas por fecha',font=font(21),fill=INK)
d.text((30,592),'en una periódica.',font=font(21),fill=INK)
save(im,'flujo-reserva.png')
im,d=diagram('arquitectura',(1200,500))
box(d,(25,180,365,345),'React · Navegador',['Interfaz y navegación','Token de sesión'])
box(d,(440,180,810,345),'Java · Spring Boot',['Permisos y reglas','Transacciones de negocio'])
box(d,(860,20,1180,170),'Supabase Auth',['Identidad','Contraseñas y sesión'],CLAY)
box(d,(860,300,1180,460),'PostgreSQL',['Reservas y catálogos','Datos persistentes'])
arrow(d,(365,270),(440,270));d.text((380,232),'API',font=font(19,True),fill=GREEN)
d.line([(190,180),(190,85),(860,85)],fill=GREEN,width=4);arrow(d,(810,85),(860,85));d.text((340,46),'Login y renovación de sesión',font=font(21),fill=GREEN)
d.line([(810,305),(835,305),(835,365),(860,365)],fill=GREEN,width=4);arrow(d,(835,365),(860,365))
d.text((35,410),'Los datos del negocio siempre pasan por Java.',font=font(24,True),fill=GREEN)
save(im,'arquitectura.png')
im,d=diagram('indicadores',(1200,350))
box(d,(20,20,580,225),'Uso de espacios',['Horas reservadas','Ocupación sobre horas habilitadas','Demanda atendida por tipo de aula'])
box(d,(620,20,1180,225),'Concurrencia prevista',['Alumnos previstos por media hora','Semana típica y horas pico','Alumnos-hora'],CLAY)
d.text((32,265),'Planificado para I-05 · No mide asistencia ni personas únicas.',font=font(27,True),fill=GREEN)
save(im,'indicadores.png')

pdfmetrics.registerFont(TTFont('Body',str(FONT/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('Bold',str(FONT/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Italic',str(FONT/'DejaVuSans-Oblique.ttf')))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Italic',boldItalic='Bold')
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10,leading=14,textColor=HexColor(INK),spaceAfter=8),
 'title':ParagraphStyle('title',fontName='Bold',fontSize=26,leading=31,textColor=HexColor(GREEN),spaceAfter=13),
 'caption':ParagraphStyle('caption',fontName='Body',fontSize=8.3,leading=11,textColor=HexColor(MUTED),spaceAfter=8),
 'bullet':ParagraphStyle('bullet',fontName='Body',fontSize=9.6,leading=13.5,textColor=HexColor(INK),leftIndent=10,spaceAfter=6),
 'code':ParagraphStyle('code',fontName='Body',fontSize=9,leading=13,backColor=HexColor(SAGE),borderPadding=9,spaceAfter=10),
}
BASE='https://github.com/gabbce/seminario-integrador/blob/feat/integracion/'
def inline(s):
    s=escape(s)
    def link(m):
        label,url=m.groups()
        if not url.startswith(('http:','https:')):
            import os
            rel=os.path.relpath((ROOT/url).resolve(),ROOT.parents[1])
            url=BASE+rel
        return f'<a href="{url}" color="{GREEN}"><u>{label}</u></a>'
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<i>\1</i>',s)
    return s
limits={'cuentas-real.png':335,'revision-real.png':325,'confirmacion-real.png':180,'agenda-real.png':270,'detalle-movil-real.png':190,'flujo-reserva.png':280,'entregas.png':185,'arquitectura.png':220,'indicadores.png':150}
text=(ROOT/'README.md').read_text()
sections=re.split(r'^## ',text,flags=re.M)[1:]
story=[]
for n,section in enumerate(sections):
    if n:story.append(PageBreak())
    title,body=section.split('\n',1)
    story.append(Paragraph('AULAS / GUÍA DEL EQUIPO' if n==0 else f'INCORPORACIÓN / {n+1:02}',styles['caption']))
    story.append(Paragraph(inline(title),styles['title']))
    if n==0:story.append(Paragraph('Seminario Integrador · 17/09/2026 · Cierre de I-03<br/>Lectura: 15–20 minutos. Para quienes retoman desde la definición original.',styles['caption']))
    for block in re.split(r'\n\s*\n',body.strip()):
        if block.startswith('!['):
            m=re.match(r'!\[([^\]]*)\]\(([^)]+)\)',block);path=ROOT/m[2]
            iw,ih=Raster.open(path).size;scale=min(499/iw,limits.get(path.name,240)/ih)
            story.append(Image(str(path),width=iw*scale,height=ih*scale));story.append(Spacer(1,7))
        elif block.startswith('```'):
            lines=block.splitlines()[1:-1];story.append(Preformatted('\n'.join(lines),styles['code']))
        elif re.match(r'\d+\. ',block):
            for line in block.splitlines():story.append(Paragraph(inline(line),styles['bullet']))
        elif block.startswith('- '):
            for line in block.splitlines():story.append(Paragraph('• '+inline(line[2:]),styles['bullet']))
        else:story.append(Paragraph(inline(block.replace('\n',' ')),styles['caption' if block.startswith('*') and not block.startswith('**') else 'body']))
def footer(c,doc):
    c.setStrokeColor(HexColor('#D8DCD5'));c.line(48,42,547,42)
    c.setFont('Body',8);c.setFillColor(HexColor(MUTED));c.drawString(48,28,'Aulas · Estado al 17/09/2026 · Datos ficticios');c.drawRightString(547,28,str(doc.page))
SimpleDocTemplate(str(ROOT/'aulas-guia-equipo.pdf'),pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=35,bottomMargin=55,title='Aulas · Guía de incorporación al proyecto',author='Equipo Seminario Integrador').build(story,onFirstPage=footer,onLaterPages=footer)
print(ROOT/'aulas-guia-equipo.pdf')

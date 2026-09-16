from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.units import mm
from math import pi
from pathlib import Path

OUT_DIR = Path('/mnt/data')
CLIENT_PDF = OUT_DIR / 'withus-report-cliente-premium.pdf'
INTERNAL_PDF = OUT_DIR / 'withus-report-agenzia-premium.pdf'

# Fonts
FONT_DIR = '/usr/share/fonts/truetype/lato'
pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/Lato-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Medium', f'{FONT_DIR}/Lato-Medium.ttf'))
pdfmetrics.registerFont(TTFont('Inter-SemiBold', f'{FONT_DIR}/Lato-Semibold.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/Lato-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Inter-ExtraBold', f'{FONT_DIR}/Lato-Heavy.ttf'))

W, H = A4

# Palette
DARK = HexColor('#101820')
DARK2 = HexColor('#17252f')
DARK3 = HexColor('#203743')
GREEN = HexColor('#02984e')
GREEN_VIVID = HexColor('#01c061')
GREEN_DARK = HexColor('#016b38')
GREEN_PALE = HexColor('#eaf7f0')
BG = HexColor('#eef2f4')
PAPER = HexColor('#ffffff')
BORDER = HexColor('#dce3e8')
TEXT = HexColor('#1f2a37')
TEXT2 = HexColor('#5a6b7c')
TEXT3 = HexColor('#8b9aa9')
RED = HexColor('#a3352a')
RED_PALE = HexColor('#fff5f3')
AMBER = HexColor('#b06a00')
AMBER_PALE = HexColor('#fff4e6')
BLUE = HexColor('#356b8c')
BLUE_PALE = HexColor('#eef7fb')
GRAY_PALE = HexColor('#f6f8f9')

# Paragraph styles
styles = {
    'body': ParagraphStyle('body', fontName='Inter', fontSize=9.4, leading=13.5, textColor=TEXT),
    'body_small': ParagraphStyle('body_small', fontName='Inter', fontSize=8.1, leading=11.5, textColor=TEXT2),
    'body_tiny': ParagraphStyle('body_tiny', fontName='Inter', fontSize=7.1, leading=9.8, textColor=TEXT2),
    'white_body': ParagraphStyle('white_body', fontName='Inter', fontSize=9.3, leading=13.2, textColor=HexColor('#cbd8de')),
    'card_title': ParagraphStyle('card_title', fontName='Inter-SemiBold', fontSize=10.2, leading=13, textColor=TEXT),
    'table': ParagraphStyle('table', fontName='Inter', fontSize=7.2, leading=9.8, textColor=TEXT),
    'table_bold': ParagraphStyle('table_bold', fontName='Inter-SemiBold', fontSize=7.2, leading=9.8, textColor=TEXT),
    'table_white': ParagraphStyle('table_white', fontName='Inter-SemiBold', fontSize=7.2, leading=9.4, textColor=white),
}

def P(text, style='body'):
    return Paragraph(text, styles[style])

def draw_para(c, text, x, y_top, width, style='body', max_height=200):
    p = P(text, style)
    w, h = p.wrap(width, max_height)
    p.drawOn(c, x, y_top - h)
    return h

def rr(c, x, y, w, h, r=10, fill=PAPER, stroke=BORDER, lw=0.8):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)

def label(c, text, x, y, color=TEXT2, size=7.3, font='Inter-SemiBold', tracking=0):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)

def text(c, value, x, y, size=10, color=TEXT, font='Inter'):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, value)

def text_right(c, value, x, y, size=10, color=TEXT, font='Inter'):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x, y, value)

def draw_logo(c, x, y, dark=False, compact=False):
    s = 25 if compact else 30
    c.setFillColor(GREEN)
    c.roundRect(x, y-s, s, s, 7, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Inter-ExtraBold', 8.5 if compact else 10)
    c.drawCentredString(x+s/2, y-s+9 if compact else y-s+10.5, 'WU')
    c.setFillColor(white if dark else DARK)
    c.setFont('Inter-Bold', 9 if compact else 10.5)
    c.drawString(x+s+8, y-10, 'WITH US')
    c.setFillColor(HexColor('#a6bac4') if dark else TEXT3)
    c.setFont('Inter', 6.4 if compact else 7)
    c.drawString(x+s+8, y-20, 'CONSULENZA ASSICURATIVA')

def draw_demo(c, dark=False):
    c.setFillColor(Color(1,1,1,.12) if dark else HexColor('#eef2f4'))
    c.setStrokeColor(Color(1,1,1,.18) if dark else BORDER)
    c.roundRect(W-56*mm, H-17*mm, 39*mm, 8*mm, 4*mm, fill=1, stroke=1)
    c.setFillColor(white if dark else TEXT2)
    c.setFont('Inter-Bold', 7.5)
    c.drawCentredString(W-36.5*mm, H-14.2*mm, 'DATI DIMOSTRATIVI')

def footer(c, page_no, dark=False, internal=False):
    y=12*mm
    c.setStrokeColor(Color(1,1,1,.12) if dark else BORDER)
    c.setLineWidth(.6)
    c.line(18*mm, y+5*mm, W-18*mm, y+5*mm)
    c.setFont('Inter', 6.8)
    c.setFillColor(HexColor('#98adb7') if dark else TEXT3)
    c.drawString(18*mm, y, 'With Us Assicurazioni - Analisi dei bisogni assicurativi')
    if internal:
        c.drawCentredString(W/2, y, 'USO INTERNO - non consegnare al cliente')
    c.drawRightString(W-18*mm, y, f'Pagina {page_no}')

def header(c, title, subtitle, page_no, internal=False):
    c.setFillColor(PAPER)
    c.rect(0,0,W,H,fill=1,stroke=0)
    draw_logo(c,18*mm,H-14*mm,dark=False,compact=True)
    draw_demo(c,dark=False)
    text(c,title,18*mm,H-32*mm,19,TEXT,'Inter-Bold')
    text(c,subtitle,18*mm,H-39*mm,8.8,TEXT2,'Inter')
    c.setStrokeColor(BORDER)
    c.line(18*mm,H-45*mm,W-18*mm,H-45*mm)
    footer(c,page_no,dark=False,internal=internal)

def draw_icon(c, kind, cx, cy, size, color=GREEN, bg=GREEN_PALE):
    # Premium, simple vector pictograms: no dependency on icon fonts.
    c.setFillColor(bg)
    c.setStrokeColor(bg)
    c.roundRect(cx-size/2, cy-size/2, size, size, size*.25, fill=1, stroke=0)
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.5)
    u=size/10
    if kind=='family':
        c.circle(cx-2.1*u,cy+1.8*u,1.25*u,fill=0,stroke=1)
        c.circle(cx+2.1*u,cy+1.8*u,1.25*u,fill=0,stroke=1)
        c.circle(cx,cy+0.1*u,1.0*u,fill=0,stroke=1)
        c.arc(cx-4.3*u,cy-3.2*u,cx,cy+0.2*u,0,180)
        c.arc(cx,cy-3.2*u,cx+4.3*u,cy+0.2*u,0,180)
        c.arc(cx-2.3*u,cy-3.7*u,cx+2.3*u,cy-0.7*u,0,180)
    elif kind=='home':
        c.line(cx-3.5*u,cy,cx,cy+3.2*u); c.line(cx,cy+3.2*u,cx+3.5*u,cy)
        c.rect(cx-2.7*u,cy-3*u,5.4*u,3.2*u,fill=0,stroke=1)
        c.rect(cx-0.65*u,cy-3*u,1.3*u,2.1*u,fill=0,stroke=1)
    elif kind=='health':
        c.setLineCap(1)
        c.line(cx-3.2*u,cy,cx-1.2*u,cy); c.line(cx-1.2*u,cy,cx-0.2*u,cy+2.2*u)
        c.line(cx-0.2*u,cy+2.2*u,cx+1.0*u,cy-2.4*u); c.line(cx+1.0*u,cy-2.4*u,cx+2.0*u,cy)
        c.line(cx+2.0*u,cy,cx+3.2*u,cy)
    elif kind=='savings':
        c.circle(cx,cy,3.1*u,fill=0,stroke=1)
        c.setFont('Inter-Bold',size*.27); c.drawCentredString(cx,cy-size*.09,'EUR')
    elif kind=='work':
        c.roundRect(cx-3.4*u,cy-2.8*u,6.8*u,5.2*u,0.7*u,fill=0,stroke=1)
        c.rect(cx-1.4*u,cy+2.4*u,2.8*u,1.2*u,fill=0,stroke=1)
        c.line(cx-3.4*u,cy-0.2*u,cx+3.4*u,cy-0.2*u)
    elif kind=='shield':
        p=c.beginPath(); p.moveTo(cx,cy+3.7*u); p.lineTo(cx+3.2*u,cy+2.3*u); p.lineTo(cx+2.6*u,cy-1.8*u); p.curveTo(cx+1.8*u,cy-3.2*u,cx+0.5*u,cy-3.8*u,cx,cy-4*u); p.curveTo(cx-0.5*u,cy-3.8*u,cx-1.8*u,cy-3.2*u,cx-2.6*u,cy-1.8*u); p.lineTo(cx-3.2*u,cy+2.3*u); p.close(); c.drawPath(p,fill=0,stroke=1)
        c.line(cx-1.5*u,cy,cx-0.4*u,cy-1.2*u); c.line(cx-0.4*u,cy-1.2*u,cx+1.8*u,cy+1.2*u)
    elif kind=='heart':
        p=c.beginPath(); p.moveTo(cx,cy-3.2*u); p.curveTo(cx-4*u,cy-0.8*u,cx-4*u,cy+2.2*u,cx-1.7*u,cy+2.8*u); p.curveTo(cx-0.5*u,cy+3.1*u,cx,cy+2.2*u,cx,cy+1.7*u); p.curveTo(cx,cy+2.2*u,cx+0.5*u,cy+3.1*u,cx+1.7*u,cy+2.8*u); p.curveTo(cx+4*u,cy+2.2*u,cx+4*u,cy-0.8*u,cx,cy-3.2*u); c.drawPath(p,fill=0,stroke=1)
    else:
        c.circle(cx,cy,2.8*u,fill=0,stroke=1)
        c.line(cx,cy-1.6*u,cx,cy+1.6*u); c.line(cx-1.6*u,cy,cx+1.6*u,cy)

def status_colors(kind):
    return {
        'red': (RED, RED_PALE),
        'amber': (AMBER, AMBER_PALE),
        'blue': (BLUE, BLUE_PALE),
        'green': (GREEN_DARK, GREEN_PALE),
    }[kind]

def badge(c, value, x, y, w, kind='amber'):
    fg,bg=status_colors(kind)
    c.setFillColor(bg); c.setStrokeColor(bg)
    c.roundRect(x,y,w,7*mm,3.5*mm,fill=1,stroke=0)
    c.setFillColor(fg); c.setFont('Inter-Bold',7.2)
    c.drawCentredString(x+w/2,y+2.45*mm,value)

def score_bar(c, x, y, w, score, kind='amber'):
    fg,bg=status_colors(kind)
    c.setFillColor(HexColor('#e8edf0')); c.roundRect(x,y,w,4.1*mm,2*mm,fill=1,stroke=0)
    c.setFillColor(fg); c.roundRect(x,y,max(4.1*mm,w*score/100),4.1*mm,2*mm,fill=1,stroke=0)

def score_ring(c, cx, cy, r, score, kind='red'):
    fg,bg=status_colors(kind)
    c.setLineWidth(9)
    c.setStrokeColor(Color(1,1,1,.14))
    c.circle(cx,cy,r,fill=0,stroke=1)
    c.setStrokeColor(fg)
    c.setLineCap(1)
    # ReportLab arc angles start at x-axis. Draw clockwise visually by using 90 to 90+score*3.6.
    c.arc(cx-r,cy-r,cx+r,cy+r,90,score*3.6)
    c.setFillColor(white)
    c.setFont('Inter-ExtraBold',25)
    c.drawCentredString(cx,cy-3, str(score))
    c.setFont('Inter-SemiBold',7.5)
    c.setFillColor(HexColor('#bcd0d8'))
    c.drawCentredString(cx,cy-17,'SU 100')

def bullet_line(c, text_value, x, y, width, color=GREEN, style='body_small'):
    c.setFillColor(color); c.circle(x+2.2, y-4, 2.2, fill=1, stroke=0)
    h=draw_para(c,text_value,x+10,y,width-10,style,40)
    return max(h,10)

def client_page_1(c):
    # Full premium cover
    c.setFillColor(DARK); c.rect(0,0,W,H,fill=1,stroke=0)
    # layered shapes
    c.setFillColor(DARK2); c.circle(W-32*mm,H-38*mm,68*mm,fill=1,stroke=0)
    c.setFillColor(Color(0.01,0.75,0.38,.10)); c.circle(W-20*mm,H-20*mm,48*mm,fill=1,stroke=0)
    c.setFillColor(DARK3); c.roundRect(18*mm,22*mm,W-36*mm,54*mm,14,fill=1,stroke=0)
    draw_logo(c,18*mm,H-17*mm,dark=True)
    draw_demo(c,dark=True)
    label(c,'ANALISI DEI BISOGNI ASSICURATIVI',18*mm,H-57*mm,HexColor('#9fc5b0'),7.8,'Inter-Bold')
    text(c,'La tua fotografia',18*mm,H-72*mm,29,white,'Inter-Bold')
    text(c,'assicurativa',18*mm,H-84*mm,29,white,'Inter-Bold')
    draw_para(c,'Una sintesi chiara delle aree da proteggere, delle coperture gia presenti e dei punti da approfondire con il tuo consulente.',18*mm,H-94*mm,92*mm,'white_body',70)
    # score card on right
    rr(c,W-78*mm,H-132*mm,60*mm,67*mm,16,fill=Color(1,1,1,.06),stroke=Color(1,1,1,.10),lw=.7)
    label(c,'INDICATORE DELLE NECESSITÀ',W-69*mm,H-78*mm,HexColor('#a8bbc4'),7.2,'Inter-Bold')
    score_ring(c,W-48*mm,H-104*mm,18*mm,84,'red')
    text(c,'Priorità alta',W-68*mm,H-126*mm,11,white,'Inter-Bold')
    text(c,'Sono emerse 2 aree prioritàrie',W-68*mm,H-132*mm,7.5,HexColor('#a9bec8'),'Inter')
    # client data strip
    x=24*mm; y=39*mm
    label(c,'CLIENTE',x,y+19*mm,HexColor('#8fa6b1'),6.8,'Inter-Bold')
    text(c,'Mario Rossi',x,y+12*mm,14,white,'Inter-SemiBold')
    label(c,'DATA ANALISI',x+58*mm,y+19*mm,HexColor('#8fa6b1'),6.8,'Inter-Bold')
    text(c,'4 agosto 2026',x+58*mm,y+12*mm,10,white,'Inter-Medium')
    label(c,'CONSULENTE',x+105*mm,y+19*mm,HexColor('#8fa6b1'),6.8,'Inter-Bold')
    text(c,'Francesco - With Us',x+105*mm,y+12*mm,10,white,'Inter-Medium')
    c.setFillColor(GREEN_VIVID); c.roundRect(24*mm,y-2*mm,45*mm,7*mm,3.5*mm,fill=1,stroke=0)
    c.setFillColor(DARK); c.setFont('Inter-Bold',7.2); c.drawCentredString(46.5*mm,y+0.5*mm,'ANALISI COMPLETATA')
    footer(c,1,dark=True)
    c.showPage()

def client_page_2(c):
    header(c,'Il quadro in sintesi','Le necessità emerse, ordinate per priorità e stato delle coperture.',2)
    y=H-58*mm
    # Primary need callout
    rr(c,18*mm,y-45*mm,W-36*mm,41*mm,12,fill=RED_PALE,stroke=HexColor('#efd0ca'))
    draw_icon(c,'family',34*mm,y-24*mm,18*mm,RED,HexColor('#fde9e5'))
    label(c,'NECESSITÀ PRINCIPALE',48*mm,y-11*mm,RED,7.2,'Inter-Bold')
    callout_style = ParagraphStyle('callout_title', fontName='Inter-Bold', fontSize=12.6, leading=15, textColor=RED)
    ptitle = Paragraph('Proteggere la continuità economica della famiglia', callout_style)
    _, ph = ptitle.wrap(94*mm, 32*mm)
    ptitle.drawOn(c,48*mm,y-15*mm-ph)
    draw_para(c,'La presenza di figli, un mutuo attivo e una forte dipendenza dal reddito principale rendono prioritària la verifica di una tutela in caso di morte, invalidità o lunga interruzione lavorativa.',48*mm,y-30*mm,126*mm,'body_small',45)
    badge(c,'PRIORITÀ ALTA',W-59*mm,y-16*mm,35*mm,'red')

    # Need cards - 2 columns, 3 rows. Badge and score stay in a dedicated footer band.
    areas=[
        ('Famiglia e reddito','family',92,'Priorità alta','red','Nucleo familiare dipendente dal reddito principale.'),
        ('Salute e infortuni','health',86,'Scopertura','red','Nessuna copertura salute o infortuni dichiarata.'),
        ('Casa e patrimonio','home',68,'Da verificare','blue','Polizza casa presente: massimali e garanzie da controllare.'),
        ('Previdenza e risparmio','savings',54,'Da approfondire','amber','Fondo pensione presente, obiettivi futuri da chiarire.'),
        ('Responsabilità e professione','work',43,'Da approfondire','amber','Serve verificare responsabilità familiari e lavorative.'),
        ('Coerenza complessiva','shield',61,'Parziale','blue','Esistono alcune tutele, ma non coprono tutte le priorità.'),
    ]
    card_w=(W-42*mm)/2; card_h=37*mm
    start_y=y-54*mm
    title_style = ParagraphStyle('need_title', fontName='Inter-SemiBold', fontSize=9.2, leading=11.2, textColor=TEXT)
    desc_style = ParagraphStyle('need_desc', fontName='Inter', fontSize=7.1, leading=9.1, textColor=TEXT2)
    for i,a in enumerate(areas):
        col=i%2; row=i//2
        x=18*mm+col*(card_w+6*mm); yy=start_y-row*(card_h+5*mm)-card_h
        rr(c,x,yy,card_w,card_h,10,fill=PAPER,stroke=BORDER)
        draw_icon(c,a[1],x+13*mm,yy+card_h-12*mm,13*mm,*status_colors(a[4]))
        p=Paragraph(a[0],title_style); _,th=p.wrap(card_w-32*mm,14*mm); p.drawOn(c,x+23*mm,yy+card_h-7*mm-th)
        pd=Paragraph(a[5],desc_style); _,dh=pd.wrap(card_w-30*mm,18*mm); pd.drawOn(c,x+23*mm,yy+card_h-18*mm-dh)
        score_bar(c,x+7*mm,yy+6*mm,card_w-48*mm,a[2],a[4])
        text(c,f'{a[2]}/100',x+7*mm,yy+13*mm,7.6,status_colors(a[4])[0],'Inter-Bold')
        badge(c,a[3].upper(),x+card_w-36*mm,yy+4.5*mm,31*mm,a[4])
    draw_para(c,'Il colore blu non significa che la protezione sia adeguata: indica che esiste già un prodotto e che bisogna verificarne contenuti, esclusioni, massimali e coerenza con la situazione attuale.',18*mm,29*mm,W-36*mm,'body_tiny',30)
    c.showPage()

def client_page_3(c):
    header(c,'Perché queste aree sono prioritàrie','Le motivazioni sono collegate alle risposte raccolte, non a una proposta automatica.',3)
    y=H-58*mm
    # Family section
    rr(c,18*mm,y-74*mm,W-36*mm,69*mm,12,fill=PAPER,stroke=BORDER)
    draw_icon(c,'family',33*mm,y-20*mm,18*mm,RED,RED_PALE)
    text(c,'Famiglia e continuità del reddito',47*mm,y-15*mm,14,TEXT,'Inter-Bold')
    badge(c,'92/100 - PRIORITÀ ALTA',W-71*mm,y-20*mm,47*mm,'red')
    draw_para(c,'Questa e l\'area principale emersa dall\'analisi.',47*mm,y-22*mm,90*mm,'body_small',25)
    line_y=y-35*mm
    h=bullet_line(c,'Il reddito di Mario sostiene gran parte delle spese familiari.',27*mm,line_y,75*mm,RED); line_y-=h+3
    h=bullet_line(c,'Sono presenti due figli e un mutuo ancora attivo.',27*mm,line_y,75*mm,RED); line_y-=h+3
    h=bullet_line(c,'Non risulta dichiarata una copertura TCM o equivalente.',27*mm,line_y,75*mm,RED)
    # What to discuss panel
    rr(c,111*mm,y-65*mm,75*mm,43*mm,9,fill=GRAY_PALE,stroke=HexColor('#edf0f2'))
    label(c,'DA APPROFONDIRE CON IL CONSULENTE',118*mm,y-31*mm,TEXT2,6.7,'Inter-Bold')
    yy=y-38*mm
    for item in ['Capitale necessario per il mutuo','Spese familiari da garantire','Durata della protezione','Coperture aziendali già disponibili']:
        h=bullet_line(c,item,118*mm,yy,61*mm,GREEN,'body_tiny'); yy-=h+2
    # Health section
    y2=y-85*mm
    rr(c,18*mm,y2-74*mm,W-36*mm,69*mm,12,fill=PAPER,stroke=BORDER)
    draw_icon(c,'health',33*mm,y2-20*mm,18*mm,RED,RED_PALE)
    text(c,'Salute e infortuni',47*mm,y2-15*mm,14,TEXT,'Inter-Bold')
    badge(c,'86/100 - SCOPERTURA',W-69*mm,y2-20*mm,45*mm,'red')
    draw_para(c,'Non risultano coperture specifiche dichiarate.',47*mm,y2-22*mm,90*mm,'body_small',25)
    line_y=y2-35*mm
    h=bullet_line(c,'Una lunga assenza dal lavoro avrebbe un impatto economico significativo.',27*mm,line_y,75*mm,RED); line_y-=h+3
    h=bullet_line(c,'Non sono state indicate polizze salute o infortuni.',27*mm,line_y,75*mm,RED); line_y-=h+3
    h=bullet_line(c,'Le eventuali tutele del datore di lavoro devono essere verificate.',27*mm,line_y,75*mm,RED)
    rr(c,111*mm,y2-65*mm,75*mm,43*mm,9,fill=GRAY_PALE,stroke=HexColor('#edf0f2'))
    label(c,'DA APPROFONDIRE CON IL CONSULENTE',118*mm,y2-31*mm,TEXT2,6.7,'Inter-Bold')
    yy=y2-38*mm
    for item in ['Invalidità permanente','Diaria o ricovero','Spese mediche','Continuità del reddito']:
        h=bullet_line(c,item,118*mm,yy,61*mm,GREEN,'body_tiny'); yy-=h+2
    # disclaimer
    rr(c,18*mm,23*mm,W-36*mm,18*mm,8,fill=BLUE_PALE,stroke=HexColor('#d3e5ed'))
    draw_para(c,'Queste indicazioni non costituiscono una raccomandazione personalizzata né sostituiscono l\'analisi contrattuale. Prima di qualsiasi proposta occorre verificare situazione economica, coperture esistenti, esclusioni e condizioni di assicurabilità.',25*mm,36*mm,W-50*mm,'body_tiny',35)
    c.showPage()

def client_page_4(c):
    header(c,'Le aree da verificare','Prodotti già presenti e bisogni secondari da esaminare con attenzione.',4)
    y=H-58*mm
    cards=[
        {
            'title':'Casa e patrimonio','icon':'home','kind':'blue','badge':'PRODOTTO PRESENTE','score':68,
            'intro':'È stata dichiarata una polizza casa, ma la sua adeguatezza non è ancora verificata.',
            'why':['Abitazione di proprietà con mutuo attivo','Il valore di ricostruzione non è stato controllato','Eventi naturali e danni da acqua da verificare','Responsabilità civile della famiglia da confermare']
        },
        {
            'title':'Previdenza e risparmio','icon':'savings','kind':'amber','badge':'DA APPROFONDIRE','score':54,
            'intro':'È presente un fondo pensione, ma mancano dati su contributi, obiettivo e capitale atteso.',
            'why':['Verificare contribuzione e costi','Chiarire l\'orizzonte temporale','Valutare la coerenza con gli obiettivi familiari','Non confondere previdenza e protezione dei rischi']
        },
        {
            'title':'Responsabilità e professione','icon':'work','kind':'amber','badge':'DA COMPLETARE','score':43,
            'intro':'Non emergono criticità immediate, ma le informazioni raccolte non sono sufficienti per chiudere l\'area.',
            'why':['Verificare professione e mansioni','Controllare responsabilità verso terzi','Considerare attività sportive o hobby','Valutare eventuali coperture aziendali']
        }
    ]
    ch=59*mm
    for idx,card in enumerate(cards):
        yy=y-(idx+1)*ch-idx*5*mm
        rr(c,18*mm,yy,W-36*mm,ch-5*mm,12,fill=PAPER,stroke=BORDER)
        draw_icon(c,card['icon'],32*mm,yy+ch-20*mm,17*mm,*status_colors(card['kind']))
        text(c,card['title'],45*mm,yy+ch-16*mm,13,TEXT,'Inter-Bold')
        badge(c,card['badge'],W-66*mm,yy+ch-22*mm,42*mm,card['kind'])
        score_bar(c,45*mm,yy+ch-27*mm,72*mm,card['score'],card['kind'])
        text(c,f"{card['score']}/100",122*mm,yy+ch-29*mm,8,status_colors(card['kind'])[0],'Inter-Bold')
        draw_para(c,card['intro'],45*mm,yy+ch-34*mm,133*mm,'body_small',30)
        bx=26*mm; by=yy+14*mm
        for j,item in enumerate(card['why']):
            col=j%2; row=j//2
            x=bx+col*81*mm; yb=by-row*11*mm
            c.setFillColor(status_colors(card['kind'])[0]); c.circle(x,yb+1.5,2,fill=1,stroke=0)
            draw_para(c,item,x+7,yb+6,70*mm,'body_tiny',22)
    c.showPage()

def client_page_5(c):
    header(c,'I prossimi passi','Dalla fotografia iniziale a una consulenza concreta e documentata.',5)
    y=H-60*mm
    steps=[
        ('1','Verificare ciò che hai già','Raccogliere polizze, condizioni, massimali, franchigie ed eventuali coperture aziendali.'),
        ('2','Quantificare i bisogni','Definire capitale per il mutuo, spese familiari, reddito da proteggere e obiettivi futuri.'),
        ('3','Valutare le alternative','Confrontare le soluzioni disponibili e decidere solo dopo averne compreso costi, limiti ed esclusioni.'),
    ]
    for i,(num,title_v,body) in enumerate(steps):
        yy=y-i*43*mm
        c.setFillColor(GREEN); c.circle(31*mm,yy,9*mm,fill=1,stroke=0)
        c.setFillColor(white); c.setFont('Inter-ExtraBold',13); c.drawCentredString(31*mm,yy-4,num)
        if i<2:
            c.setStrokeColor(HexColor('#c6ddd0')); c.setLineWidth(2); c.line(31*mm,yy-9*mm,31*mm,yy-34*mm)
        text(c,title_v,48*mm,yy+3*mm,13,TEXT,'Inter-Bold')
        draw_para(c,body,48*mm,yy-4*mm,W-72*mm,'body_small',45)
    rr(c,18*mm,68*mm,W-36*mm,42*mm,14,fill=DARK2,stroke=DARK2)
    draw_icon(c,'shield',34*mm,89*mm,18*mm,GREEN_VIVID,Color(1,1,1,.08))
    text(c,'Porta questo report al tuo consulente With Us',49*mm,94*mm,14,white,'Inter-Bold')
    draw_para(c,'Il prossimo colloquio partirà dalle priorità emerse e dalle coperture che possiedi già. Nessuna proposta dovrebbe essere formulata senza questa verifica.',49*mm,87*mm,101*mm,'white_body',45)
    c.setFillColor(white); c.roundRect(W-63*mm,82*mm,39*mm,12*mm,6*mm,fill=1,stroke=0)
    c.setFillColor(DARK2); c.setFont('Inter-Bold',6.8); c.drawCentredString(W-43.5*mm,86.2*mm,'PRENOTA IL COLLOQUIO')
    rr(c,18*mm,27*mm,W-36*mm,31*mm,10,fill=GRAY_PALE,stroke=BORDER)
    label(c,'TRACCIABILITÀ DELLA COMPILAZIONE',25*mm,49*mm,TEXT2,6.8,'Inter-Bold')
    text(c,'Consenso privacy acquisito tramite OTP - simulazione grafica',25*mm,42*mm,8.4,TEXT,'Inter-Medium')
    text(c,'Analisi ID: AB-2026-00417  |  Versione questionario: 1.0  |  Data: 04/08/2026',25*mm,35*mm,7.2,TEXT2,'Inter')
    text_right(c,'Documento dimostrativo - non valido ai fini contrattuali',W-25*mm,35*mm,7.2,RED,'Inter-SemiBold')
    c.showPage()

def make_client_pdf():
    c=canvas.Canvas(str(CLIENT_PDF),pagesize=A4,pageCompression=1)
    c.setTitle('With Us - Report cliente premium')
    c.setAuthor('With Us Assicurazioni')
    client_page_1(c); client_page_2(c); client_page_3(c); client_page_4(c); client_page_5(c)
    c.save()

# Internal report helpers

def internal_cover(c):
    c.setFillColor(DARK); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(DARK2); c.roundRect(18*mm,23*mm,W-36*mm,H-46*mm,18,fill=1,stroke=0)
    draw_logo(c,28*mm,H-31*mm,dark=True)
    draw_demo(c,dark=True)
    label(c,'SCHEDA INTERNA DI ANALISI',28*mm,H-68*mm,HexColor('#9fc5b0'),8,'Inter-Bold')
    text(c,'Mario Rossi',28*mm,H-84*mm,27,white,'Inter-Bold')
    text(c,'Analisi dei bisogni - uso consulenziale',28*mm,H-95*mm,11,HexColor('#b8cad2'),'Inter')
    # profile cards
    facts=[('Nucleo','Coppia con 2 figli'),('Abitazione','Proprietà con mutuo'),('Reddito','Principale per la famiglia'),('Coperture','Casa + fondo pensione')]
    for i,(k,v) in enumerate(facts):
        x=28*mm+(i%2)*79*mm; y=H-132*mm-(i//2)*29*mm
        rr(c,x,y,72*mm,22*mm,8,fill=Color(1,1,1,.05),stroke=Color(1,1,1,.09))
        label(c,k.upper(),x+8*mm,y+14*mm,HexColor('#8ea6b1'),6.4,'Inter-Bold')
        text(c,v,x+8*mm,y+7*mm,9.2,white,'Inter-SemiBold')
    # overall score and primary action
    rr(c,28*mm,58*mm,151*mm,60*mm,12,fill=Color(1,1,1,.045),stroke=Color(1,1,1,.08))
    score_ring(c,56*mm,88*mm,18*mm,84,'red')
    label(c,'PRIORITA PRINCIPALE',83*mm,102*mm,HexColor('#9fc5b0'),6.8,'Inter-Bold')
    text(c,'Continuità economica della famiglia',83*mm,91*mm,13,white,'Inter-Bold')
    draw_para(c,'Verificare TCM / protezione mutuo, invalidità e continuità del reddito. Prima azione: raccogliere contratti esistenti e quantificare il fabbisogno.',83*mm,84*mm,84*mm,'white_body',50)
    badge(c,'AZIONE ENTRO 7 GIORNI',83*mm,65*mm,48*mm,'red')
    footer(c,1,dark=True,internal=True)
    c.showPage()

def internal_matrix(c):
    header(c,'Matrice operativa','Evidenze, coperture dichiarate e prossima azione per ogni area.',2,internal=True)
    data=[
        [P('Area','table_white'),P('Score','table_white'),P('Stato','table_white'),P('Evidenze','table_white'),P('Coperture dichiarate','table_white'),P('Prossima azione','table_white')],
        [P('<b>Famiglia e reddito</b>','table'),P('<b>92</b>','table'),P('Priorità alta','table'),P('2 figli; mutuo; reddito principale','table'),P('Nessuna TCM dichiarata','table'),P('Quantificare capitale e durata; verificare tutele aziendali','table')],
        [P('<b>Salute e infortuni</b>','table'),P('<b>86</b>','table'),P('Scopertura','table'),P('Impatto alto di una lunga assenza','table'),P('Nessuna copertura specifica','table'),P('Verificare invalidita, diaria, spese mediche e franchigie','table')],
        [P('<b>Casa e patrimonio</b>','table'),P('<b>68</b>','table'),P('Da verificare','table'),P('Casa di proprietà con mutuo','table'),P('Polizza casa presente','table'),P('Acquisire fascicolo; controllare ricostruzione, eventi naturali, RC','table')],
        [P('<b>Previdenza e risparmio</b>','table'),P('<b>54</b>','table'),P('Da approfondire','table'),P('Interesse per pensione e risparmio','table'),P('Fondo pensione presente','table'),P('Verificare contribuzione, costi, orizzonte e obiettivo','table')],
        [P('<b>Responsabilita e professione</b>','table'),P('<b>43</b>','table'),P('Da completare','table'),P('Dati professionali incompleti','table'),P('Nessuna copertura nota','table'),P('Raccogliere mansioni, responsabilità, hobby e attività extra','table')],
    ]
    col_widths=[30*mm,13*mm,22*mm,39*mm,35*mm,38*mm]
    t=Table(data,colWidths=col_widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),DARK2),('TEXTCOLOR',(0,0),(-1,0),white),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(1,1),(1,-1),'CENTER'),
        ('GRID',(0,0),(-1,-1),.5,BORDER),('ROWBACKGROUNDS',(0,1),(-1,-1),[PAPER,GRAY_PALE]),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    tw,th=t.wrap(W-36*mm,H-80*mm)
    t.drawOn(c,18*mm,H-56*mm-th)
    # status legend
    y=H-63*mm-th
    label(c,'LEGENDA OPERATIVA',18*mm,y,TEXT2,6.8,'Inter-Bold')
    items=[('Priorità/scopertura','red'),('Da approfondire','amber'),('Prodotto presente da verificare','blue'),('Coerente / nessuna criticità evidente','green')]
    x=18*mm
    for txt_v,kind in items:
        fg,bg=status_colors(kind); c.setFillColor(fg); c.circle(x,y-8*mm,2.2,fill=1,stroke=0)
        text(c,txt_v,x+6,y-8*mm-2,7.2,TEXT2,'Inter')
        x+=43*mm
    # immediate actions
    rr(c,18*mm,28*mm,W-36*mm,42*mm,10,fill=RED_PALE,stroke=HexColor('#efd0ca'))
    label(c,'AZIONI IMMEDIATE CONSIGLIATE',25*mm,59*mm,RED,6.8,'Inter-Bold')
    yy=52*mm
    for item in ['Richiedere copia della polizza casa e del fondo pensione.','Quantificare debito residuo del mutuo e spese familiari annue.','Verificare coperture del datore di lavoro e condizioni di assicurabilità.','Fissare un colloquio di approfondimento entro 7 giorni.']:
        h=bullet_line(c,item,25*mm,yy,157*mm,RED,'body_tiny'); yy-=h+1.5
    c.showPage()

def internal_conversation(c):
    header(c,'Traccia per il colloquio','Domande, dati mancanti e criteri per evitare proposte generiche.',3,internal=True)
    y=H-59*mm
    blocks=[
        ('1. Chiarire il fabbisogno familiare','family','red',[
            'Quanto resta da rimborsare sul mutuo e per quanti anni?',
            'Quale reddito mensile deve essere garantito alla famiglia?',
            'Esistono altri redditi, risparmi o patrimoni immediatamente disponibili?',
            'Sono presenti coperture TCM, invalidita o welfare aziendale?'
        ]),
        ('2. Verificare le coperture esistenti','shield','blue',[
            'Acquisire fascicolo della polizza casa e appendici.',
            'Controllare massimali, franchigie, esclusioni e adeguamento valori.',
            'Acquisire posizione del fondo pensione e contribuzione attuale.',
            'Evitare duplicazioni prima di valutare nuove soluzioni.'
        ]),
        ('3. Collegare i prodotti ai bisogni','heart','amber',[
            'Presentare prima il rischio e l\'obiettivo, poi il prodotto.',
            'Spiegare perché una soluzione è coerente con i dati raccolti.',
            'Documentare alternative, limiti e motivi della scelta.',
            'Lasciare al cliente tempo e materiali comprensibili.'
        ]),
    ]
    for idx,(title_v,icon,kind,items) in enumerate(blocks):
        yy=y-idx*55*mm-48*mm
        rr(c,18*mm,yy,W-36*mm,46*mm,11,fill=PAPER,stroke=BORDER)
        draw_icon(c,icon,32*mm,yy+31*mm,16*mm,*status_colors(kind))
        text(c,title_v,45*mm,yy+35*mm,12,TEXT,'Inter-Bold')
        bx=45*mm; by=yy+25*mm
        for j,item in enumerate(items):
            col=j%2; row=j//2
            x=bx+col*69*mm; yb=by-row*16*mm
            h=bullet_line(c,item,x,yb,62*mm,status_colors(kind)[0],'body_tiny')
    # note and consent
    rr(c,18*mm,26*mm,83*mm,31*mm,9,fill=GRAY_PALE,stroke=BORDER)
    label(c,'DATI ANCORA MANCANTI',25*mm,48*mm,TEXT2,6.8,'Inter-Bold')
    draw_para(c,'Debito residuo mutuo; reddito netto familiare; patrimonio liquido; coperture aziendali; attività sportive; professione dettagliata.',25*mm,43*mm,69*mm,'body_tiny',38)
    rr(c,106*mm,26*mm,80*mm,31*mm,9,fill=BLUE_PALE,stroke=HexColor('#d5e6ed'))
    label(c,'PRIVACY E TRACCIABILITÀ',113*mm,48*mm,BLUE,6.8,'Inter-Bold')
    draw_para(c,'OTP simulato acquisito. In produzione registrare versione informativa, recapito verificato, data, ora, esito e identificativo della sessione.',113*mm,43*mm,66*mm,'body_tiny',38)
    c.showPage()

def make_internal_pdf():
    c=canvas.Canvas(str(INTERNAL_PDF),pagesize=A4,pageCompression=1)
    c.setTitle('With Us - Scheda interna premium')
    c.setAuthor('With Us Assicurazioni')
    internal_cover(c); internal_matrix(c); internal_conversation(c)
    c.save()

if __name__=='__main__':
    make_client_pdf(); make_internal_pdf()
    print(CLIENT_PDF)
    print(INTERNAL_PDF)

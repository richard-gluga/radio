"""Render progressive-enhancement helpers beside the canonical instructions."""
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "site/experience.json").read_text())
e = html.escape


def enrich(content, configure):
    tools = {name: whole for whole, name in re.findall(r'(<section id="([^"]+)".*?</section>)', (ROOT / "site/tools.html").read_text(), re.S)}
    pieces = re.split(r'(?=<h2 id="\d+-)', content)
    assert len(pieces) == 14, "All 13 tutorial chapters must be represented"
    out = [f'<div class="guide-intro">{pieces[0]}</div>']
    navigation = []
    for i, (piece, stage) in enumerate(zip(pieces[1:], DATA["stages"]), 1):
        heading = re.search(r'<h2 id="([^"]+)">(.*?)</h2>', piece)
        anchor = heading[1]
        navigation.append(f'<li><a href="#{anchor}" data-stage-link="{i}"><span class="step-number">{i:02}</span><span>{e(stage["title"])}</span><span class="step-tick" aria-hidden="true"></span></a></li>')
        piece = piece.replace(heading[0], heading[0].replace('<h2 ', '<h2 tabindex="-1" ') + f'<div class="stage-brief"><p class="eyebrow">{e(stage["phase"])}</p><dl><div><dt>Gather</dt><dd>{e(stage["need"])}</dd></div><div><dt>Do</dt><dd>{e(stage["action"])}</dd></div><div><dt>Look for</dt><dd>{e(stage["expect"])}</dd></div></dl></div>', 1)
        if i == 2:
            piece = piece.replace('<table class="parts-table">', '<div id="shopping-tools" class="enhanced-only shopping-toolbar"><p id="shopping-count" role="status"></p><div class="actions"><button id="export-shopping" type="button">Save shopping list</button><button id="print-shopping" type="button" class="secondary">Print shopping list</button></div><p class="help">Mark a row ready only when its full quantity is available. Saved on this browser; no account needed.</p></div><table class="parts-table">')
            piece += '<fieldset id="tool-checklist" class="tool-checklist enhanced-only"><legend>Check your tools & workspace</legend>' + ''.join(f'<label><input type="checkbox" data-tool="{j}">{e(t)}</label>' for j,t in enumerate(DATA['tools'])) + '</fieldset>'
            piece += '<details class="package-check"><summary>What comes in the box?</summary><p>The speaker has two pre-tinned leads. The protected battery has its factory JST-PH lead. The reader kit’s S50 card/key fob cannot be used for this story workflow: buy NTAG213/215 separately.</p><p>Check each supplier’s package contents for loose headers, the amplifier terminal block, and the pot nut/washer. Obtain any missing ones before assembly. The matching knob, extension, switches, jumpers, USB cable/supply, enclosure and mounting materials are separate shopping rows.</p></details>'
        if i == 4:
            marker = '<li>Download the <strong>complete sketch ZIP</strong>'
            assert marker in piece, "Configuration belongs at the download step"
            piece = piece.replace(marker, '</ol><div id="configure-home">'+configure+'</div><ol start="9">'+marker, 1)
        if i == 5:
            piece += tools['wiring-lab'] + tools['diagnostics']
        if i == 6:
            piece += '<p class="enhanced-only"><a href="#wiring-lab" data-wire-jump="amp">Open the amplifier connections in the wiring bench →</a></p>'
        if i == 7:
            piece = piece.replace('<ol>', '<div id="configure-radio"></div><p><a href="#configure">Open the configuration form →</a></p><ol>', 1)
        if i == 11:
            piece += tools['finish-kit']
        if i == 12:
            piece = piece.replace('<table>', tools['fix-it']+'<h3>All symptoms at a glance</h3><table class="troubleshooting-table">', 1)
        checks = ''.join(f'<label><input type="checkbox" data-check="{i}-{j}">{e(c)}</label>' for j,c in enumerate(stage['checks']))
        piece += f'<fieldset class="stage-checks enhanced-only"><legend>Before you move on</legend>{checks}</fieldset><div class="stage-controls enhanced-only"><button type="button" data-previous="{i}" class="secondary">Previous</button><span class="stage-position">Step {i} of 13</span><button type="button" data-next="{i}">{"Finish & review" if i == 13 else "Next step"}</button></div>'
        out.append(f'<section class="build-stage" data-stage="{i}" aria-labelledby="{anchor}">{piece}</section>')
    glossary = '<details class="glossary"><summary>New to the words? Open the glossary</summary><dl>'+''.join(f'<dt>{e(k)}</dt><dd>{e(v)}</dd>' for k,v in DATA['glossary'].items())+'</dl></details>'
    return ''.join(out), '<ol class="step-list">'+''.join(navigation)+'</ol>'+glossary


def printables():
    template = (ROOT / "site/printables.html").read_text()
    checks = ''.join(f'<h3>{i}. {e(s["title"])}</h3>'+''.join(f'<p class="paper-check">□ {e(c)}</p>' for c in s['checks']) for i,s in enumerate(DATA['stages'][:11], 1))
    return template.replace('<!-- CHECKPOINTS -->', checks)

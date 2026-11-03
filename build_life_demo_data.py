#!/usr/bin/env python3
# MindBlown — © 2026 Rory Jones. All rights reserved. Source-available under the PolyForm Strict License 1.0.0 (see LICENSE.md).
"""Generate a fully fictional *life* brain for the MindBlown demo (life-data.js).

Everything here is invented: Sam Vale, Port Ellery, the people, the boat, the mail,
the calendar, the playlists and the bank-category names. It mirrors the structure of
a real life brain — life-domain lobes, people/place/habit/event neurons, sub-neurons
one level deeper, and synapses cited to session / mail / calendar / music / bank /
memory / brain-page sources — without containing a single real datum.
"""
import json, os, random, uuid, collections

random.seed(20261102)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'life-data.js')
TODAY = '2026-11-01'

LOBES = [
    {'id': 'self',   'name': 'Sam',                     'color': '#fde68a'},
    {'id': 'family', 'name': 'Family & Juno',           'color': '#f472b6'},
    {'id': 'crew',   'name': 'Crew & Friends',          'color': '#e879f9'},
    {'id': 'work',   'name': 'Harbour Work',            'color': '#ff8a3d'},
    {'id': 'studio', 'name': 'Vale Studio',             'color': '#60a5fa'},
    {'id': 'money',  'name': 'Money',                   'color': '#34d399'},
    {'id': 'home',   'name': 'Home & Port Ellery',      'color': '#a78bfa'},
    {'id': 'body',   'name': 'Body & Mind',             'color': '#22d3ee'},
    {'id': 'play',   'name': 'Play & Taste',            'color': '#fbbf24'},
    {'id': 'pref',   'name': 'Preferences',             'color': '#a3e635'},
    {'id': 'trail',  'name': 'Search trail',            'color': '#94a3b8', 'hidden': True},
]

# ------------------------------------------------------------------ sources
SOURCES = {}
def src(uri, label, kind):
    SOURCES.setdefault(uri, {'label': label, 'kind': kind}); return uri
def U(): return str(uuid.UUID(int=random.getrandbits(128)))
def SES(title, date): return src(f'pplx://sessions/{U()}', f'{title[:48]} · {date}', 'session')
def GM(subject, date, frm=None): return src(f'https://mail.example.test/demo/{U()[:12]}', f'{subject[:48]} · {date}', 'gmail')
def CAL(title, date): return src(f'gcal://demo-{U()[:10]}', f'{title[:48]} · {date}', 'calendar')
def SP(name): return src(f'https://music.example.test/playlist/{U()[:16]}', f'Music · {name[:40]}', 'spotify')
def GH(repo): return src(f'https://git.example.test/sam-vale/{repo}', f'sam-vale/{repo}', 'github')
def MEM(path, label): return src('memory://notes/' + path, 'Memory · ' + label, 'memory')
def WIKI(pid, label): return src('wiki://' + pid, 'Brain · ' + label, 'wiki')
def WEB(url, label): return src(url, label, 'web')
BANK_CAT = src('bank://transactions/by-category/2026', 'Bank · 2026 spending by category (names only)', 'plaid')
BANK_MER = src('bank://transactions/by-merchant/2026', 'Bank · 2026 merchants (names only)', 'plaid')
BANK_ACC = src('bank://accounts', 'Bank · connected accounts', 'plaid')

PAGES = []; SEEALSO = collections.defaultdict(list)
def page(pid, title, ptype, lobe, desc, syns, see=(), parent=None, created='2026-09-14', updated=TODAY):
    P = {'id': pid, 'title': title, 'type': ptype, 'lobe': lobe, 'desc': desc, 'intro': desc, 'created': created, 'updated': updated,
         'synapses': [], 'sources': [], 'sections': []}
    if parent: P['parent'] = parent
    for i, s in enumerate(syns, 1):
        lead, text, cites = s[0], s[1], list(s[2]); links = list(s[3]) if len(s) > 3 else []; section = s[4] if len(s) > 4 else 'Synapses'
        P['synapses'].append({'id': f'{pid}#{i}', 'page': pid, 'lead': lead, 'text': text, 'section': section, 'links': links, 'cites': cites})
        for c in cites:
            if c not in P['sources']: P['sources'].append(c)
        if section not in P['sections']: P['sections'].append(section)
    SEEALSO[pid].extend(see); PAGES.append(P); return pid

# shared sources reused across pages
LIFE = SES('Can you help me get my life in order? Money, Juno, the boat, the studio', '2026-09-14')
W_LIFE = WIKI('projects/vale-life-dashboard', 'Vale life dashboard')
FOOT = SES('What is public about me online? Handles, old forum posts, race results', '2026-10-18')
W_FOOT = WIKI('projects/vale-footprint-review', 'Footprint review')
W_MAIL = WIKI('projects/vale-mail-topics', 'Mail topics')
W_TIDE = WIKI('projects/tidewatch', 'Tidewatch')
W_PINES = WIKI('projects/hollow-pines', 'Hollow Pines')
W_KITCHEN = WIKI('projects/orbit-kitchen', 'Orbit Kitchen')
W_LEDGER = WIKI('projects/ledgerline', 'Ledgerline')
W_MOONS = WIKI('projects/paper-moons', 'Paper Moons')
M_WORK = MEM('work/client', 'main client')
M_KID = MEM('family/children/daughter', 'daughter')
M_HOUSE = MEM('finance/house_and_loans', 'house and loans')
M_INCOME = MEM('finance/contract_income', 'contract income')
M_BOAT = MEM('finance/assets/boat', 'boat')
M_INS = MEM('finance/insurance/home', 'home insurance')
M_SPLIT = MEM('finance/transfers/dana_okafor', 'shared-cost transfers with Dana')

SAM = 'entities/sam-vale'
# ================================================================ SELF
page(SAM, 'Sam Vale', 'person', 'self',
     'Sam Vale: marine-electronics installer on the Port Ellery waterfront, parent of Juno, skipper of a tired 27-foot sloop, and the one-person Vale Studio. This brain radiates out from Sam into the domains of a life.',
     [
      ('Installer by trade', 'Sam fits navigation electronics and wiring on small craft as a contractor for Harbourline Systems, invoicing per boat with a regatta-season rush every spring.', [M_WORK, M_INCOME], ['work/harbourline']),
      ('Lives in Port Ellery', 'A narrow house two streets up from the harbour in the Saltmarsh Lane neighbourhood; the first search in the trail was literally "tide times Port Ellery".', [M_HOUSE, SES('tide times Port Ellery', '2026-09-14')], ['home/saltmarsh-house', 'home/saltmarsh-lane']),
      ('Parent of Juno', 'Sam\'s daughter Juno is nine, born March 3, in Year 4 at Ellery Point Primary; her school, dentist, swim squad and playlist all thread through this brain.', [M_KID, CAL("Juno's birthday", '2027-03-03')], ['people/juno']),
      ('Born August 21', 'Two calendar entries mark it: "Sam\'s birthday" and a "Cake at the club" event created by Priya Natarajan.', [CAL("Sam's birthday", '2026-08-21'), CAL('Cake at the club', '2026-08-21')], ['people/priya-natarajan']),
      ('Handles online', 'The footprint review tied sam.vale@example.test to the handles saltyvale, ValeStudio and nikau27, a code-hosting account at git.example.test/sam-vale and an old race-results listing.', [FOOT, W_FOOT], ['home/footprint', 'studio/vale-studio']),
      ('Builder as well as installer', 'Six public-ish repositories in two months: a tide planner, a cosy forest game, a meal planner, a children\'s-book site and a ledger.', [GH('tidewatch'), GH('hollow-pines'), GH('ledgerline')], ['studio/repos']),
      ('Co-parenting on a schedule', 'Juno alternates weeks between Sam and Dana Okafor under an agreement finalised in 2025; the calendar carries the rules.', [CAL('Week swap – Juno to Dana', '2026-11-08'), WIKI('projects/coparenting-agreement', 'Co-parenting agreement')], ['family/coparenting-schedule']),
      ('Asked for a whole-life operating system', 'On September 14 Sam asked for help getting money, Juno, the boat and the studio into one plan; that became the Vale life dashboard and, eventually, this map.', [LIFE, W_LIFE], ['money/overview', 'body/fitness']),
     ], see=['people/juno', 'work/harbourline', 'studio/vale-studio', 'money/overview', 'home/saltmarsh-house', 'play/music-library'])

# ================================================================ FAMILY
page('people/juno', 'Juno Vale', 'person', 'family',
     'Sam\'s daughter, nine. Ellery Point Primary, swim squad on Tuesdays, a dentist who sends too many reminders, and a playlist that opens with a song about a whale.',
     [
      ('Birthday March 3', 'The calendar entry carries the rule: regular week, two hours for the other parent.', [CAL("Juno's birthday", '2027-03-03'), M_KID], ['family/coparenting-schedule']),
      ('School mail is the family metronome', 'Newsletters, a swimming-carnival permission note, a head-lice notice and a parent-council agenda arrive from Ellery Point Primary.', [GM('Ellery Point Primary newsletter', '2026-10-27'), GM('Swimming carnival – permission', '2026-10-21'), GM('Parent council agenda', '2026-10-19')], ['family/school']),
      ('Swim squad Tuesdays', 'A recurring Tuesday 17:00 event, "Juno – squad", with a note about goggles.', [CAL('Juno – squad', '2026-10-27')], ['body/fitness']),
      ('Dentist logistics with Dana', 'Three threads in 2026 — February, August, October — coordinating Juno\'s check-ups, including a rescheduled appointment.', [GM('Juno dentist – Thursday?', '2026-08-25', 'Dana'), GM('Re: dentist moved', '2026-10-02', 'Dana')], ['people/dana-okafor', 'body/dental']),
      ('A playlist of her own', '"Juno\'s Boat Songs" opens with a whale song and runs through sea shanties, novelty tracks and two dance hits she insists on.', [SP("Juno's Boat Songs")], ['play/junos-playlist']),
      ('Education savings', 'A monthly contribution to an education savings account shows among 2026 merchants.', [BANK_MER, BANK_ACC], ['money/accounts']),
      ('Chess at lunch club', 'The school chess club sends term dates and a junior tournament notice.', [GM('Chess club – term 4 dates', '2026-10-14'), GM('Junior tournament – Saturday', '2026-10-28')], ['play/chess']),
     ], see=['people/dana-okafor', 'people/marguerite-vale', 'family/coparenting-schedule', 'play/junos-playlist'])

page('family/school', 'Ellery Point Primary', 'place', 'family', 'Juno\'s primary school: the steadiest rhythm in the inbox.',
     [
      ('Newsletters', 'Fortnightly newsletters, most recently October 13 and 27.', [GM('Ellery Point Primary newsletter', '2026-10-13'), GM('Ellery Point Primary newsletter', '2026-10-27')]),
      ('Permission slips', 'Swimming carnival (Oct 21) and the harbour-walk excursion (Oct 7).', [GM('Swimming carnival – permission', '2026-10-21'), GM('Harbour walk excursion', '2026-10-07')]),
      ('Health notices', 'A head-lice notice on October 23 and a dental-van visit on October 26.', [GM('Head lice notice', '2026-10-23'), GM('Dental van visit', '2026-10-26')], ['body/dental']),
      ('Parent council', 'Agenda and minutes from the parent council, circulated by Lior Ben-Ami.', [GM('Parent council agenda', '2026-10-19'), GM('Parent council minutes', '2026-10-22')]),
      ('Filed under Family', 'The mail clean-up gave these a Topics/Family label.', [W_MAIL]),
     ], parent='people/juno', see=['people/juno'])

page('people/dana-okafor', 'Dana Okafor', 'person', 'family',
     'Juno\'s other parent and Sam\'s co-parent. Birthday November 12. Dentist coordination by email, alternating weeks, and a shared-cost ledger settled by transfer.',
     [
      ('Birthday November 12', '"Dana bday" on the calendar.', [CAL('Dana bday', '2026-11-12')]),
      ('Dentist and swim coordination', 'Most threads with Dana are logistics: dentist, squad pick-ups, a lost raincoat.', [GM('Juno dentist – Thursday?', '2026-08-25', 'Dana'), GM('Raincoat?', '2026-10-09', 'Dana')], ['people/juno', 'body/dental']),
      ('Shared costs by transfer', 'A memory note tracks small transfers both ways for school fees, swim squad and the dentist, matched to bank data for 2026.', [M_SPLIT, BANK_ACC], ['money/accounts']),
      ('Week swap', 'Handover is Sunday evening; the calendar shows "Week swap – Juno to Dana" and back.', [CAL('Week swap – Juno to Dana', '2026-11-08'), CAL('Week swap – Juno to Sam', '2026-11-15')], ['family/coparenting-schedule']),
     ], see=['people/juno', 'family/coparenting-schedule'])

page('family/coparenting-schedule', 'Co-parenting schedule', 'habit', 'family',
     'Alternating weeks with Sunday handovers, holidays split by odd and even years, and a birthday rule — all encoded as calendar events.',
     [
      ('Alternating weeks', 'Handover Sunday 17:00; events recur for the whole school year.', [CAL('Week swap – Juno to Dana', '2026-11-08')], ['people/dana-okafor']),
      ('Holidays by year parity', 'Even years: Dana has the first half of the summer break; odd years the reverse. A January 3 "summer-half swap" reminder keeps it honest.', [CAL('Summer-half swap reminder', '2027-01-03'), WIKI('projects/coparenting-agreement', 'Co-parenting agreement')]),
      ('Birthday rule', 'Regular week holds on Juno\'s birthday, with two hours for the other parent.', [CAL("Juno's birthday", '2027-03-03')], ['people/juno']),
      ('Agreement finalised 2025', 'Mediated and signed in 2025; the Brain keeps a summary, not the document.', [WIKI('projects/coparenting-agreement', 'Co-parenting agreement')]),
     ], see=['people/juno', 'people/dana-okafor'])

page('people/marguerite-vale', 'Marguerite Vale', 'person', 'family',
     'Sam\'s mother. Birthday April 9. Forwards the family health-fund paperwork, co-plans the club\'s winter dinner, and wants a Hollow Pines save of her own.',
     [
      ('Birthday April 9', '"Mum bday" on the calendar.', [CAL('Mum bday', '2027-04-09')]),
      ('Keeper of the health fund', 'Marguerite forwarded the Harbour Mutual health-fund statement twice in June and the dental schedule in July.', [GM('Fwd: Harbour Mutual – your statement', '2026-06-16', 'Marguerite'), GM('Fwd: dental schedule', '2026-07-02', 'Marguerite')], ['family/health-fund']),
      ('Winter dinner co-planner', 'An October thread with Marguerite carried the Port Ellery Sailing Club winter-dinner checklists as PDF and Word.', [GM('Winter dinner – checklists (PDF + Word)', '2026-10-15', 'Marguerite')], ['crew/winter-dinner']),
      ('Hollow Pines grandma', 'October 8: "Can my mum have her own cabin save on the family server?"', [SES('Can my mum have her own cabin save on the family server?', '2026-10-08')], ['play/gaming']),
      ('Surprise party organiser', 'She forwarded the invitation to Tomasz\'s surprise 60th in October 2025.', [GM("Fwd: Tomasz's surprise 60th", '2025-10-22', 'Marguerite')], ['people/family-circle']),
     ], see=['people/juno', 'crew/winter-dinner'])

page('people/family-circle', 'Family circle', 'person', 'family', 'The recurring people-dates on the calendar beyond the household.',
     [
      ('Tomasz and Hana', 'Sam\'s uncle Tomasz (birthday Oct 2) and aunt Hana (Jun 26).', [CAL('Tomasz bday', '2026-10-02'), CAL('Hana bday', '2026-06-26')]),
      ('Parents\' anniversary', 'July 18.', [CAL('Marguerite & Theo anniversary', '2026-07-18')], ['people/marguerite-vale']),
      ('Cousin Ines', 'Birthday September 1; a "Hello from the island!" from Sam the day after Halloween.', [CAL('Ines bday', '2026-09-01'), GM('Hello from the island!', '2026-11-01')]),
     ], see=['people/marguerite-vale', 'family/birthdays'])

page('family/birthdays', 'Birthdays & anniversaries', 'habit', 'family', 'The people-dates in calendar order.',
     [
      ('March–April', 'Juno (Mar 3), Mum (Apr 9).', [CAL("Juno's birthday", '2027-03-03'), CAL('Mum bday', '2027-04-09')], ['people/juno']),
      ('June–August', 'Hana (Jun 26), parents\' anniversary (Jul 18), Sam (Aug 21).', [CAL('Hana bday', '2026-06-26'), CAL("Sam's birthday", '2026-08-21')]),
      ('September–November', 'Ines (Sep 1), Tomasz (Oct 2), Dana (Nov 12).', [CAL('Ines bday', '2026-09-01'), CAL('Dana bday', '2026-11-12')], ['people/dana-okafor']),
     ], parent='people/family-circle', see=['people/family-circle'])

page('family/health-fund', 'Harbour Mutual health fund', 'account', 'family', 'The family health and dental cover Marguerite keeps forwarding; Harbour Mutual shows among merchants.',
     [
      ('Forwarded twice', 'Statement forwarded June 16; dental schedule July 2.', [GM('Fwd: Harbour Mutual – your statement', '2026-06-16', 'Marguerite')], ['people/marguerite-vale']),
      ('On the merchant list', 'Harbour Mutual is a monthly merchant.', [BANK_MER], ['money/merchants']),
      ('Covers Juno\'s dentist', 'Claims go through for Juno\'s check-ups, which is why Dana has the member number.', [GM('Re: dentist moved', '2026-10-02', 'Dana')], ['body/dental']),
     ], see=['body/dental'])

# ================================================================ CREW & FRIENDS
page('crew/sailing-club', 'Port Ellery Sailing Club', 'place', 'crew', 'The club at the end of the breakwater: Wednesday twilight races, a winter dinner, and the people Sam actually sees.',
     [
      ('Twilight series', 'Wednesday twilight races from October to March; "Twilight race" recurs on the calendar.', [CAL('Twilight race', '2026-10-28')], ['crew/nikau-27']),
      ('Mail', 'Race notices, a mooring-fee reminder and the winter-dinner thread.', [GM('Twilight series – sailing instructions', '2026-10-05'), GM('Mooring fee reminder', '2026-10-20')], ['money/merchants']),
      ('Birthday cake at the club', 'Priya\'s "Cake at the club" event on August 21.', [CAL('Cake at the club', '2026-08-21')], ['people/priya-natarajan']),
      ('Beta crew for Tidewatch', 'Six club members test Tidewatch; the beta-crew page in the Brain lists their feedback board.', [WIKI('projects/tidewatch-beta-crew', 'Tidewatch Beta Crew')], ['studio/tidewatch']),
     ], see=['crew/nikau-27', 'crew/winter-dinner', 'people/priya-natarajan'])

page('crew/nikau-27', 'Nikau 27 "Marrow"', 'entity', 'crew', 'Sam\'s 27-foot sloop, bought tired in 2021, re-wired twice, and the reference boat for Tidewatch\'s defaults.',
     [
      ('Valued by hand', 'A memory note values the boat from three brokerage listings; survey date and engine hours unconfirmed.', [M_BOAT], ['money/overview']),
      ('Reference boat', 'Tidewatch\'s polar and draft defaults are Marrow\'s numbers.', [WIKI('entities/nikau-27', 'Nikau 27'), W_TIDE], ['studio/tidewatch']),
      ('Haul-out', 'Calendar: "Haul-out – antifoul" on November 14–15.', [CAL('Haul-out – antifoul', '2026-11-14')]),
      ('Chandlery is a merchant', 'Breakwater Chandlery recurs; marine is its own category.', [BANK_MER, BANK_CAT], ['money/merchants']),
     ], parent='crew/sailing-club', see=['studio/tidewatch'])

page('crew/winter-dinner', 'Winter dinner', 'event', 'crew', 'The club\'s July dinner, which Sam and Marguerite half-run: checklists, a Rat Pack-ish playlist and a seating plan.',
     [
      ('Checklists with Mum', 'PDF and Word checklists traded on October 15–16 for next year\'s dinner.', [GM('Winter dinner – checklists (PDF + Word)', '2026-10-15', 'Marguerite')], ['people/marguerite-vale']),
      ('The playlist', '"Breakwater Lounge": Sinatra, Dean Martin, Nat King Cole, Louis Prima.', [SP('Breakwater Lounge')], ['play/music-library']),
      ('Print materials', 'A hospitality-suite project in the Brain holds menus and place cards.', [WIKI('projects/winter-dinner-suite', 'Winter dinner suite')]),
     ], parent='crew/sailing-club', see=['people/marguerite-vale'])

page('people/priya-natarajan', 'Priya Natarajan', 'person', 'crew', 'Race crew, birthday-cake organiser and the other half of a shared playlist that leans industrial.',
     [
      ('Created the cake event', 'The August 21 "Cake at the club" event lists Priya as creator.', [CAL('Cake at the club', '2026-08-21')]),
      ('Shared playlist', '"Priya + saltyvale": Nine Inch Nails, Sleep Token, CZARFACE.', [SP('Priya + saltyvale')], ['play/loud']),
      ('Foredeck', 'Priya does bow on Marrow in the twilight series.', [CAL('Twilight race', '2026-10-28')], ['crew/nikau-27']),
     ], see=['crew/sailing-club'])

page('people/tomasz-wrona', 'Tomasz Wrona', 'person', 'crew', 'Harbourline\'s yard foreman, Sam\'s uncle by marriage, and the person who taught Sam to crimp properly.',
     [
      ('Foreman', 'Tomasz schedules the yard; most Harbourline work mail comes from him.', [GM('Next week: two Beneteaus and the pilot boat', '2026-10-24', 'Tomasz')], ['work/harbourline']),
      ('Surprise 60th', 'October 2025.', [GM("Fwd: Tomasz's surprise 60th", '2025-10-22', 'Marguerite')], ['people/family-circle']),
     ], see=['work/harbourline'])

# ================================================================ WORK
page('work/harbourline', 'Harbourline Systems', 'account', 'work', 'Sam\'s main client: a marine-electronics yard on the Port Ellery waterfront. Invoiced per boat, with a spring regatta rush.',
     [
      ('Contractor, not employee', 'Per-boat invoices in the HL-VALE-### pattern, with parts at cost plus labour; treated as sole-trader income.', [M_WORK, M_INCOME], ['money/income-model']),
      ('Yard schedule by mail', 'Tomasz sends the week\'s boats every Friday.', [GM('Next week: two Beneteaus and the pilot boat', '2026-10-24', 'Tomasz')], ['people/tomasz-wrona']),
      ('Out-of-town jobs', 'A pilot-boat refit in Cape Marrow and a trade show in Halvern fill the 2026 travel calendar.', [CAL('Cape Marrow – pilot boat refit', '2026-07-13'), CAL('Halvern Marine Expo', '2026-09-22')], ['work/travel-2026']),
      ('Other clients', 'Two private owners and the harbour authority appear as occasional invoicees.', [M_INCOME], ['work/other-clients']),
     ], see=['work/travel-2026', 'money/income-model', 'work/gear-research'])

page('work/other-clients', 'Other clients', 'account', 'work', 'The harbour authority and two private owners — the smaller side of the invoice book.',
     [
      ('Harbour authority', 'Nav-light audits twice a year.', [M_INCOME], ['work/harbourline']),
      ('Private owners', 'Re-wires for a ketch and a motor-sailer, both club members.', [M_INCOME], ['crew/sailing-club']),
     ], parent='work/harbourline', see=['work/harbourline'])

page('work/travel-2026', 'A year of work trips', 'trip', 'work', 'The 2026 work-travel calendar: a refit in Cape Marrow, a trade show in Halvern, and a certification course.',
     [
      ('Cape Marrow refit', 'July 13–24, pilot boat; ferry both ways.', [CAL('Cape Marrow – pilot boat refit', '2026-07-13')]),
      ('Halvern Marine Expo', 'September 22–24; the trip that produced three gear-research sessions.', [CAL('Halvern Marine Expo', '2026-09-22')], ['work/gear-research']),
      ('NMEA certification', 'A two-day course on October 29–30.', [CAL('NMEA 2000 installer course', '2026-10-29')], ['work/learning']),
      ('Travel is a category', 'Travel appears as its own 2026 category, with a ferry company and two motels among merchants.', [BANK_CAT, BANK_MER], ['money/spending-shape']),
     ], see=['work/harbourline', 'play/travel'])

page('work/gear-research', 'Instruments & wiring research', 'project', 'work', 'A research burst from September 20 to October 6 across chartplotters, AIS transponders, NMEA 2000 backbones and wind sensors — the raw material for Tidewatch\'s device page.',
     [
      ('Chartplotters', 'Five sessions comparing 9-inch plotters and their chart formats.', [SES('9 inch chartplotter comparison 2026', '2026-09-20'), SES('which plotters read vector charts offline', '2026-09-21')], ['studio/tidewatch']),
      ('AIS', 'Class B+ transponders and splitter options.', [SES('class b+ ais transponder splitter', '2026-09-28'), SES('ais silent mode legality', '2026-09-28')]),
      ('NMEA 2000', 'Backbone length, terminators, and "why is my wind sensor dropping off the bus".', [SES('nmea 2000 backbone max length', '2026-10-01'), SES('wind sensor dropping off nmea bus', '2026-10-06')], ['work/learning']),
      ('Wind sensors', 'Ultrasonic versus cups.', [SES('ultrasonic wind sensor vs cups small boat', '2026-10-02')]),
     ], see=['studio/tidewatch', 'work/learning'], created='2026-09-20', updated='2026-10-06')

page('work/learning', 'Learning lanes', 'habit', 'work', 'NMEA 2000 certification, a lithium-house-bank course, and "AI for the studio" as the three lanes the life dashboard set.',
     [
      ('Three lanes', 'NMEA 2000, lithium systems, AI tooling.', [W_LIFE, LIFE], ['body/road-mode']),
      ('Course booked', 'NMEA 2000 installer course, October 29–30.', [CAL('NMEA 2000 installer course', '2026-10-29')], ['work/travel-2026']),
      ('Job alerts still arrive', 'A marine-jobs board emails "Marine electrician – Halvern" on November 1.', [GM('Marine electrician – Halvern', '2026-11-01')], ['money/income-model']),
     ], see=['work/harbourline'])

# ================================================================ STUDIO
page('studio/vale-studio', 'Vale Studio', 'project', 'studio', 'The one-person brand around everything Sam makes: handles, a logo, a storefront and a November 1 session that hired Perplexity as head of marketing.',
     [
      ('Handles', 'ValeStudio and saltyvale, found in the footprint review.', [FOOT, W_FOOT], ['home/footprint']),
      ('Head of marketing', 'November 1: "Assume the role of my head of marketing for Tidewatch and Hollow Pines."', [SES('Assume the role of my head of marketing for Tidewatch and Hollow Pines', '2026-11-01')]),
      ('Where to launch', 'October 7: best places to show a beta app; October 4: a logo brief.', [SES('best places to show a beta app', '2026-10-07'), SES('studio logo brief: lantern, wave, pine', '2026-10-04')]),
      ('Storefront plumbing', 'A payments provider and a donation link were looked up in late September.', [SES('indie app payments provider comparison', '2026-10-04'), SES('donation link for a free game', '2026-09-29')], ['money/subscriptions']),
     ], see=['studio/repos', 'studio/tidewatch', 'studio/hollow-pines', 'studio/paper-moons'], created='2026-09-29')

REPOS = [('tidewatch', 'Sailing weather and tide planner', 118, 14), ('hollow-pines', 'Cosy forest-cabin browser game', 61, 12), ('orbit-kitchen', 'Weekly meal planner', 44, 9),
         ('paper-moons-site', "Children's picture-book site", 12, 0), ('ledgerline', 'Private household ledger', 57, 21), ('garden-ledger', 'Raised-bed planting log', 9, 0),
         ('mindblown-demo', 'This map (public, fictional)', 6, 0)]
page('studio/repos', 'Code portfolio', 'project', 'studio', f'{len(REPOS)} repositories under sam-vale, created between October 4 and November 1, 2026.',
     [(name, f'{desc}. {c} commits, {p} pull requests.', [GH(name)]) for name, desc, c, p in REPOS],
     see=['studio/tidewatch', 'studio/hollow-pines', 'studio/ledgerline'], created='2026-10-04')

page('studio/tidewatch', 'Tidewatch', 'project', 'studio', 'The flagship: a tide and weather planner for small-boat day trips, with an offline phone build and a club beta crew.',
     [
      ('What it is', 'Hourly wind, swell and tide timeline with confidence bands; offline harbour charts; a passage planner.', [W_TIDE, GH('tidewatch')]),
      ('Fed by the gear research', 'The device page came straight out of the chartplotter and AIS sessions.', [WIKI('projects/tidewatch-forecast-engine', 'Tidewatch Forecast Engine')], ['work/gear-research']),
      ('Beta crew', 'Six club members and a feedback board.', [WIKI('projects/tidewatch-beta-crew', 'Tidewatch Beta Crew')], ['crew/sailing-club']),
      ('Store release', 'Listing, screenshots and staged rollout.', [WIKI('projects/tidewatch-store-release', 'Tidewatch Store Release')]),
      ('Review budget', 'Automated review capped at three passes per PR.', [GM('Re: [sam-vale/tidewatch] Harbour cards: share sheet', '2026-11-01')], ['preferences/review-budget']),
     ], parent='studio/repos', see=['crew/nikau-27'], created='2026-10-04')

page('studio/hollow-pines', 'Hollow Pines', 'project', 'studio', 'A cosy browser game about tending a forest cabin through four seasons, with a radio, a sky and visiting animals.',
     [
      ('The game', 'Cabin, seasons, visitors, radio.', [W_PINES, GH('hollow-pines')]),
      ('Family server', 'A shared save so Marguerite and Juno can have their own cabins.', [SES('Can my mum have her own cabin save on the family server?', '2026-10-08')], ['people/marguerite-vale', 'play/gaming']),
      ('Rooted in real fires', 'October 12–13: how to lay a fire, and what the shimmer above one is called.', [SES('how to lay a fire that lights first time', '2026-10-12'), SES('what is the wavy air above a fire called', '2026-10-13')], ['play/fire-and-sky']),
      ('Performance', 'Draw budgets and the GPU-timeout evidence.', [WIKI('projects/hollow-pines-performance', 'Hollow Pines Performance')]),
     ], parent='studio/repos', see=['play/fire-and-sky'], created='2026-10-05')

page('studio/ledgerline', 'Ledgerline', 'project', 'studio', 'The private household ledger: imports statements, reads receipts from mail, and mirrors the connected accounts in the Money lobe.',
     [
      ('What it does', 'Statement import, receipt reading, reviewable categories.', [W_LEDGER, GH('ledgerline')]),
      ('Mail receipts', 'Optional receipt intake from mail with owner review.', [WIKI('projects/ledgerline-mail-receipts', 'Ledgerline mail receipts')]),
      ('Same money as the Money lobe', 'It mirrors the three Harbour Bank accounts and the Kestrel investment accounts.', [BANK_ACC], ['money/accounts', 'money/overview']),
     ], parent='studio/repos', see=['money/overview'], created='2026-10-20')

page('studio/paper-moons', 'Paper Moons', 'project', 'studio', 'A children\'s picture-book series with a site, and an October 19 search for small presses that take illustrated submissions.',
     [
      ('Site', 'paper-moons-site, a 90 MB static site created October 21.', [GH('paper-moons-site'), W_MOONS]),
      ('Presses', '"small presses accepting illustrated picture book submissions" on October 19.', [SES('small presses accepting illustrated picture book submissions', '2026-10-19')]),
      ('Juno-adjacent', 'Bedtime theme, next to Juno\'s playlist in time and spirit.', [SP("Juno's Boat Songs")], ['people/juno']),
     ], parent='studio/repos', see=['studio/vale-studio'], created='2026-10-19')

page('studio/orbit-kitchen', 'Orbit Kitchen', 'project', 'studio', 'A weekly meal planner that rotates recipes by season and pantry; it quietly runs Sam and Juno\'s weeks.',
     [
      ('Planner', 'Season-aware weekly plans with leftover windows.', [W_KITCHEN, GH('orbit-kitchen')]),
      ('Grocery runs', 'Aisle-ordered lists; Ellery Grocer is the top food merchant.', [BANK_MER], ['money/merchants']),
     ], parent='studio/repos', see=['money/merchants'])

page('studio/toolchain', 'AI & dev toolchain', 'habit', 'studio', 'The stack assembled in the first week of October: an AI coding assistant, an automated reviewer, a hosting account, voice generation.',
     [
      ('Coding assistant', 'Sign-in and connect-to-repo questions on October 4, then four sessions on October 27–28.', [SES('connect ai coding assistant to a private repo', '2026-10-04'), SES('coding assistant lost the repo context again', '2026-10-27')]),
      ('Automated review', '"how do I run a review bot on a pull request" on October 4; by late October it reviews every PR.', [SES('how do i run a review bot on a pull request', '2026-10-04'), GM('Re: [sam-vale/ledgerline] Import: ask before posting', '2026-10-30')], ['preferences/review-budget']),
      ('Voice', 'A text-to-speech tool explored on October 6 for Paper Moons read-alongs.', [SES('text to speech for a picture book read-along', '2026-10-06')], ['studio/paper-moons']),
      ('Paid stack', 'Two AI vendors and a design-tool subscription appear among merchants.', [BANK_MER], ['money/subscriptions']),
     ], see=['studio/repos', 'money/subscriptions'], created='2026-09-29')

page('studio/media', 'Video, images & art', 'habit', 'studio', 'A YouTube channel for the studio, a chess-battle video idea and "Bob Ross, but harbours".',
     [
      ('Channel', 'October 25: how to run a second video channel under the studio login.', [SES('second video channel under the same studio login', '2026-10-25')], ['studio/vale-studio']),
      ('Bob Ross, but harbours', 'October 22.', [SES('if bob ross painted harbours at dusk what would the palette be', '2026-10-22')]),
      ('Chess battle video', 'September 13: a board where the pieces drift like boats.', [SES('stop-motion chess where the pieces drift like boats', '2026-09-13')], ['play/chess']),
      ('Image tools', 'A lightweight image viewer (Oct 30) and a design-school course (Oct 23).', [SES('lightweight image viewer windows', '2026-10-30'), GM('Get better at design with this course', '2026-10-23')]),
     ], see=['studio/vale-studio'])

# ================================================================ MONEY
page('money/overview', 'Money overview', 'account', 'money', 'The shape of Sam\'s finances as recorded in memory notes: a Saltmarsh Lane house carrying most of the net worth, a renewed mortgage, a boat loan, sole-trader income with a spring rush.',
     [
      ('Net worth is mostly the house', 'Sam\'s own notes put home equity at the bulk of net worth, with a loan-to-value just under half.', [M_HOUSE], ['home/saltmarsh-house']),
      ('Two tracked debts', 'A Coastline Credit mortgage and a boat loan are tracked manually from payments, not linked.', [M_HOUSE, M_BOAT], ['money/mortgage', 'money/boat-loan']),
      ('Income in two rhythms', 'Per-boat invoices with a spring regatta rush and a quiet winter.', [M_INCOME], ['money/income-model']),
      ('Transfers dominate the ledger', 'Transfers, income and loan payments lead the 2026 category ranking.', [BANK_CAT], ['money/spending-shape']),
      ('Second aggregator', 'A budgeting app sends periodic "new updates" digests.', [GM('Your weekly budget digest is ready', '2026-10-03')], ['money/accounts']),
     ], see=['money/mortgage', 'money/accounts', 'money/spending-shape', 'studio/ledgerline'], created='2026-09-14')

page('money/mortgage', 'Coastline Credit mortgage', 'account', 'money', 'Renewed April 2025 over a 20-year amortization, maturing 2030; a rate-change notice arrived October 31, 2026.',
     [
      ('Renewal terms', 'Renewed 2025-04-01, 240-month amortization, matures 2030-04-01; balance and payment live only in Sam\'s notes.', [M_HOUSE]),
      ('Rate change', 'Coastline Credit emailed a rate-change notification October 31.', [GM('Coastline Credit – rate change notification', '2026-10-31')]),
      ('Loan payments rank third', 'By count, in 2026.', [BANK_CAT], ['money/spending-shape']),
     ], parent='money/overview', see=['home/saltmarsh-house'])

page('money/boat-loan', 'Boat loan', 'account', 'money', 'A small marine loan on Marrow, with a goal to clear it before the 2028 season.',
     [
      ('Clear it by 2028', 'The life dashboard framed paying off the boat loan before the 2028 season as a money goal.', [W_LIFE], ['money/overview']),
      ('Not linked', 'Tracked from payments.', [M_BOAT], ['crew/nikau-27']),
     ], parent='money/overview', see=['crew/nikau-27'])

page('money/accounts', 'Connected accounts', 'account', 'money', 'Three Harbour Bank accounts, two Kestrel investment accounts and a duplicate connection that had to be removed.',
     [
      ('Harbour Bank ×3', 'Everyday account, a foreign-currency account for the Halvern work, and a rewards card.', [BANK_ACC], ['work/travel-2026']),
      ('Kestrel', 'A tax-sheltered savings account and Juno\'s education account.', [BANK_ACC], ['people/juno']),
      ('Duplicate removed', 'A duplicate Harbour Bank connection was removed October 19 so totals stopped doubling.', [MEM('finance/data_quirks', 'data quirks')]),
     ], parent='money/overview', see=['studio/ledgerline'])

page('money/insurance', 'Insurance', 'account', 'money', 'Home cover through Breakwater Brokers (Northcape Insurance), marine cover on Marrow, and Harbour Mutual for health.',
     [
      ('Home: Northcape via Breakwater Brokers', 'Broker contact Shay Lindqvist; 2024 limits kept separate from current cover.', [M_INS], ['home/saltmarsh-house']),
      ('Marine', 'Marrow is insured through the club scheme.', [M_BOAT], ['crew/nikau-27']),
      ('Health', 'Harbour Mutual, paperwork via Marguerite.', [BANK_MER], ['family/health-fund']),
     ], parent='money/overview', see=['home/saltmarsh-house'])

page('money/subscriptions', 'Subscriptions', 'habit', 'money', 'Inferred from merchant names and inbox: two AI vendors, a design tool, a games service, a reading app, a camera cloud plan.',
     [
      ('AI and creative', 'Two AI vendors and a design tool recur as merchants.', [BANK_MER], ['studio/toolchain']),
      ('Games', 'A console subscription and a mobile game.', [BANK_MER], ['play/gaming']),
      ('Reading', 'A weekly reading digest and an e-reader club.', [GM('Weekly reads, vol. 167', '2026-11-01')], ['play/reading']),
      ('Home tech', 'Camera cloud storage and the mobile plan.', [BANK_MER], ['home/utilities']),
     ], parent='money/overview', see=['money/merchants'])

page('money/vehicle', '2019 wagon', 'account', 'money', 'A diesel wagon with a roof rack for masts, valued by hand and serviced at a garage in Halvern Road.',
     [
      ('Valuation', 'Three listing lookups; mileage unconfirmed.', [MEM('finance/assets/car', 'car')]),
      ('Service', 'Halvern Road Motors, May 25.', [CAL('Service – Halvern Road Motors', '2026-05-25')]),
      ('Fuel', 'A fuel brand recurs; transportation is mid-ranked.', [BANK_MER, BANK_CAT], ['money/spending-shape']),
     ], parent='money/overview', see=['money/overview'])

page('money/spending-shape', 'Spending shape 2026', 'habit', 'money', 'Ranked categories, names only: transfers, income, loan payments, general merchandise, marine, food & drink, government, entertainment, transportation, home improvement, utilities, medical, travel.',
     [
      ('Top of the ranking', 'Transfers, income and loan payments — the ledger is mostly plumbing.', [BANK_CAT], ['money/overview']),
      ('Everyday middle', 'General merchandise, marine, food & drink and council rates.', [BANK_CAT], ['money/merchants']),
      ('Life at the tail', 'Entertainment, transportation, home improvement, utilities, medical, travel.', [BANK_CAT], ['play/gaming', 'home/utilities', 'body/medical']),
      ('No recurring streams detected', 'The recurring-stream detector found nothing it was confident about, so subscriptions are inferred from merchant names.', [src('bank://recurring', 'Bank · recurring streams (none detected)', 'plaid')], ['money/subscriptions']),
     ], see=['money/merchants'])

page('money/merchants', 'Where the money goes', 'habit', 'money', 'Merchant names from 2026, grouped by what they say about daily life. No amounts.',
     [
      ('Groceries and household', 'Ellery Grocer leads; a hardware chain and an online marketplace follow.', [BANK_MER], ['home/saltmarsh-house']),
      ('House bills', 'Council rates, Coastal Power, the water utility, the mobile carrier, Northcape Insurance.', [BANK_MER], ['home/utilities', 'money/insurance']),
      ('Boat', 'Breakwater Chandlery, mooring fees, the fuel dock.', [BANK_MER], ['crew/nikau-27']),
      ('Pet', 'A pet-supply chain and a vet appear together — there is an animal in the house.', [BANK_MER], ['home/pet']),
      ('Play', 'A games retailer, a console subscription, a mobile game.', [BANK_MER], ['play/gaming']),
      ('Tools and AI', 'Two AI vendors, a design tool, camera cloud storage.', [BANK_MER], ['studio/toolchain']),
      ('Giving', 'A children\'s-hospital donation.', [BANK_MER]),
     ], see=['money/spending-shape'])

page('money/income-model', 'Sole-trader money model', 'habit', 'money', 'Per-boat invoices, parts at cost, a spring rush and a winter reserve as the stated goal.',
     [
      ('Invoices', 'HL-VALE-### numbering; parts at cost, labour by the hour.', [M_INCOME], ['work/harbourline']),
      ('Winter reserve', 'The life dashboard framed a reserve for the quiet months.', [W_LIFE], ['work/learning']),
      ('Income ranks second', 'Many deposits rather than one paycheque.', [BANK_CAT], ['money/spending-shape']),
     ], see=['work/harbourline'])

# ================================================================ HOME
page('home/saltmarsh-house', 'The house on Saltmarsh Lane', 'place', 'home', 'A narrow two-storey house two streets up from the harbour; the anchor for mortgage, rates, utilities, cameras and the raised beds.',
     [
      ('Owner estimate', 'Valued by owner estimate on 2026-10-19; it carries most of the net worth.', [M_HOUSE], ['money/overview', 'money/mortgage']),
      ('Council rates', 'A top merchant, in the government category.', [BANK_MER, BANK_CAT], ['money/merchants']),
      ('Heat pump service', 'Coastal Power appointment July 2; "autumn home-care tips" in October.', [CAL('Coastal Power – heat pump service', '2026-07-02'), GM('Autumn home care tips', '2026-10-29')], ['home/utilities']),
      ('Cameras', 'A camera brand on the merchant list.', [BANK_MER]),
      ('Insured through Breakwater Brokers', 'Northcape home cover.', [M_INS], ['money/insurance']),
     ], see=['home/saltmarsh-lane', 'home/utilities', 'home/garden', 'home/office'])

page('home/saltmarsh-lane', 'Saltmarsh Lane', 'place', 'home', 'The neighbourhood. Safety posts arrive from "a neighbour near Saltmarsh Lane".',
     [
      ('Warning posts', 'October 29: "Heads up: dinghy oars taken from the slipway" and "Anyone else hear the alarm at 2 AM?"', [GM('Heads up: dinghy oars taken from the slipway', '2026-10-29'), GM('Anyone else hear the alarm at 2 AM?', '2026-10-29')]),
      ('Scam story in July', 'A neighbour\'s scam story, July 19.', [GM('Fake mooring-fee invoice doing the rounds', '2026-07-19')]),
      ('Filed under Neighbourhood', 'The mail clean-up labels these Topics/Neighbourhood.', [W_MAIL], ['home/footprint']),
     ], see=['home/saltmarsh-house'])

page('home/utilities', 'Utilities & services', 'account', 'home', 'Coastal Power, the water utility, the mobile carrier, council.',
     [
      ('Power and water', 'Both recur; utilities is lower-middle.', [BANK_MER, BANK_CAT]),
      ('Fibre', 'A November 1 task compared fibre plans for the street.', [GM('Your task is complete: Fibre plans on Saltmarsh Lane', '2026-11-01')], ['home/office']),
      ('Heat pump visit', 'July 2.', [CAL('Coastal Power – heat pump service', '2026-07-02')], ['home/saltmarsh-house']),
     ], parent='home/saltmarsh-house', see=['home/saltmarsh-house'])

page('home/pet', 'A pet in the house', 'entity', 'home', 'A pet-supply chain and a vet both appear among 2026 merchants. Species unknown to this brain.',
     [('Vet and pet supplies', 'Two pet merchants in the 2026 list.', [BANK_MER], ['money/merchants'])],
     parent='home/saltmarsh-house', see=['home/saltmarsh-house'])

page('home/office', 'Home office', 'project', 'home', 'Three completed tasks on November 1: an efficient home office, turning the front room into a studio desk, and fibre plans.',
     [
      ('Efficient home office', 'Task complete, November 1.', [GM('Your plan is ready: a studio corner that doubles as an office', '2026-11-01')]),
      ('Front room as studio', '"Turn the front room into a studio desk".', [GM('Your task is complete: Turn the front room into a studio desk', '2026-11-01')], ['studio/vale-studio']),
      ('Fibre', 'Plans compared.', [GM('Your task is complete: Fibre plans on Saltmarsh Lane', '2026-11-01')], ['home/utilities']),
     ], parent='home/saltmarsh-house', see=['studio/toolchain'], created='2026-11-01')

page('home/garden', 'Raised beds', 'habit', 'home', 'A nursery on the merchant list, a garden-ledger repo and autumn tips.',
     [
      ('Nursery', 'A garden-centre purchase in 2026.', [BANK_MER]),
      ('garden-ledger', 'A tiny planting log repo.', [GH('garden-ledger')], ['studio/repos']),
      ('Autumn tips', 'Coastal Power\'s October email.', [GM('Autumn home care tips', '2026-10-29')], ['home/saltmarsh-house']),
     ], parent='home/saltmarsh-house', see=['home/saltmarsh-house'])

page('home/footprint', 'Digital footprint', 'project', 'home', 'An October 18–20 audit of everything public about Sam, followed by a mail clean-up into topic labels.',
     [
      ('The audit', '"What is public about me online?" on October 18.', [FOOT, W_FOOT], ['entities/sam-vale']),
      ('Mail clean-up', '"can you clean up my mail?" on October 20 produced Topics/ labels: Family, Club, Banking, Dev, Neighbourhood, Newsletters, Apps, Bills.', [SES('can you clean up my mail?', '2026-10-20'), W_MAIL]),
      ('Boundaries', 'Private mail stays out of anything published.', [W_FOOT]),
     ], see=['entities/sam-vale', 'studio/vale-studio'], created='2026-10-18', updated='2026-10-20')

# ================================================================ BODY & MIND
page('body/fitness', 'Fitness', 'habit', 'body', 'A gym day on the calendar, swim-squad Tuesdays as a family fixture, and a minimum-viable plan that survives refit weeks.',
     [
      ('Rowing, June 16', 'A single "Rowing machine" event two months before the birthday.', [CAL('Rowing machine', '2026-06-16')]),
      ('Minimum viable plan', 'A floor of cardio and strength with a downgrade mode for refit weeks.', [W_LIFE, LIFE], ['body/road-mode']),
      ('Squad Tuesdays', 'Juno\'s swim squad doubles as Sam\'s lap night.', [CAL('Juno – squad', '2026-10-27')], ['people/juno']),
     ], see=['body/road-mode'])

page('body/dental', 'Dentist', 'habit', 'body', 'Sam\'s own check September 18 at 09:15, plus Juno\'s coordination with Dana and a school dental van.',
     [
      ('Sep 18, 09:15', '"Dental check 09:15" on the calendar.', [CAL('Dental check 09:15', '2026-09-18')]),
      ('Juno\'s dentist', 'Threads with Dana in February, August and October.', [GM('Juno dentist – Thursday?', '2026-08-25', 'Dana')], ['people/juno', 'people/dana-okafor']),
      ('Dental van', 'School notice, October 26.', [GM('Dental van visit', '2026-10-26')], ['family/school']),
      ('Covered', 'Harbour Mutual.', [BANK_MER], ['family/health-fund']),
     ], see=['family/health-fund'])

page('body/medical', 'Medical', 'habit', 'body', 'Medical is a small, steady category; a children\'s-hospital donation sits among merchants.',
     [
      ('A category of its own', 'Near the tail of 2026 categories.', [BANK_CAT], ['money/spending-shape']),
      ('Donation', 'A children\'s hospital appears among merchants.', [BANK_MER]),
     ], see=['body/dental'])

page('body/road-mode', 'Home mode / Refit mode', 'habit', 'body', 'The life dashboard split routines into a home mode and a refit mode so habits survive out-of-town jobs.',
     [
      ('Two modes', 'Home vs refit, with recovery built in.', [W_LIFE], ['body/fitness']),
      ('Learning lanes', 'NMEA 2000, lithium, AI — things to study in motel rooms.', [W_LIFE], ['work/learning']),
      ('Why it matters', 'Two out-of-town jobs and a course in 2026.', [CAL('Cape Marrow – pilot boat refit', '2026-07-13')], ['work/travel-2026']),
     ], see=['work/travel-2026'])

page('body/sleep', 'Sleep & calm', 'habit', 'body', 'Lofi and sleep playlists, a piano-trio list, and a game built for watching a sky.',
     [
      ('Lofi and sleep lists', 'Three lofi / sleep playlists.', [SP('lofi for the night watch')], ['play/music-library']),
      ('Piano trio', 'A piano-trio playlist.', [SP('Piano trio, late')]),
      ('A sky to watch', 'Hollow Pines\' sky and radio.', [W_PINES], ['studio/hollow-pines']),
     ], see=['play/music-library'])

# ================================================================ PLAY
PLAYLISTS = [("Juno's Boat Songs", 'Whale song, shanties, novelty, two dance hits'), ('Breakwater Lounge', 'Sinatra, Dean Martin, Nat King Cole, Louis Prima'),
             ('Priya + saltyvale', 'Nine Inch Nails, Sleep Token, CZARFACE'), ('Loud', 'Gojira, Mastodon, Baroness'), ('Boat Favourites', 'Devil Makes Three, Hendrix, Colter Wall'),
             ('lofi for the night watch', 'lofi beats'), ('Piano trio, late', 'piano trio jazz'), ('Southern Gothic', 'dark folk and blues'), ('90s Rock Anthems', 'editorial'),
             ('Blues covers (AI)', 'AI-generated soul and blues covers'), ('Tarantino cuts', 'soundtrack picks'), ('Pickin\' on bluegrass', 'bluegrass covers'), ('Women of blues', 'editorial'), ('Sea shanties, loud', 'shanties')]
page('play/music-library', 'Music library', 'habit', 'play', f'{len(PLAYLISTS)} playlists: lounge, metal, blues and Southern Gothic, lofi, jazz trio, family lists and shared lists with friends.',
     [(n, f'Playlist in Sam\'s library. {d}.', [SP(n)]) for n, d in PLAYLISTS], see=['play/junos-playlist', 'play/loud', 'crew/winter-dinner'])

page('play/junos-playlist', "Juno's Boat Songs", 'project', 'play', 'Whale song first, then shanties, novelty tracks and two dance hits.',
     [('Top tracks', 'Opens with a whale song; the rest is shanties and novelty.', [SP("Juno's Boat Songs")], ['people/juno']),
      ('Curated in the Brain', 'A whale-led family playlist.', [WIKI('projects/junos-boat-songs', "Juno's Boat Songs")])],
     parent='play/music-library', see=['people/juno'])

page('play/loud', 'Loud', 'habit', 'play', 'Lamb of God, Slayer, White Zombie, Nine Inch Nails and Sleep Token — the loud end of the library.',
     [('Loud', 'Gojira and Mastodon; an October 28 lyrics search.', [SP('Loud'), SES('mastodon blood and thunder lyrics meaning', '2026-10-28')]),
      ('Shared with Priya', '"Priya + saltyvale".', [SP('Priya + saltyvale')], ['people/priya-natarajan']),
      ('Boat Favourites', 'Devil Makes Three, Hendrix, Colter Wall.', [SP('Boat Favourites')])],
     parent='play/music-library', see=['people/priya-natarajan'])

page('play/gaming', 'Gaming', 'habit', 'play', 'A mobile walking game on the go, a console at home, a handheld case redesign, a family server, and GTA anticipation.',
     [
      ('Mobile walking game', 'One of the most frequent 2026 merchants.', [BANK_MER]),
      ('Console and retailer', 'A console subscription and a games retailer recur.', [BANK_MER], ['money/subscriptions']),
      ('Handheld case', 'September 16: resize a handheld case design to match the PC case.', [SES('resize handheld case design to match pc case', '2026-09-16')], ['studio/media']),
      ('Family server', 'Hollow Pines saves for Marguerite and Juno.', [SES('Can my mum have her own cabin save on the family server?', '2026-10-08')], ['people/marguerite-vale', 'studio/hollow-pines']),
      ('Entertainment category', 'Mid-ranked in 2026.', [BANK_CAT], ['money/spending-shape']),
     ], see=['play/chess', 'studio/hollow-pines'])

page('play/chess', 'Chess', 'habit', 'play', 'School chess-club mail, a junior tournament, and two September sessions.',
     [
      ('School club', 'Term dates and a junior tournament notice.', [GM('Chess club – term 4 dates', '2026-10-14'), GM('Junior tournament – Saturday', '2026-10-28')], ['people/juno']),
      ('Play the AI', 'September 17: "Fancy a game of chess against us?"', [SES('Fancy a game of chess against us?', '2026-09-17')]),
      ('Chess battle', 'September 13: a board where the pieces drift like boats.', [SES('stop-motion chess where the pieces drift like boats', '2026-09-13')], ['studio/media']),
     ], see=['play/gaming', 'people/juno'])

page('play/reading', 'Reading & newsletters', 'habit', 'play', 'A weekly reading digest, two fact newsletters, an e-reader club, a design course.',
     [
      ('Weekly reads', 'Vol. 166 and 167.', [GM('Weekly reads, vol. 166', '2026-10-25'), GM('Weekly reads, vol. 167', '2026-11-01')]),
      ('Fact newsletters', 'Inventions, lighthouse stripes, six sea films.', [GM('Why lighthouses were painted in stripes', '2026-10-31'), GM('Six sea films worth a rainy Sunday', '2026-10-31')]),
      ('Filed under Newsletters', 'Topics/Newsletters.', [W_MAIL], ['home/footprint']),
     ], see=['money/subscriptions'])

page('play/fire-and-sky', 'Fire, for fun', 'habit', 'play', 'How to lay a fire, what the shimmer above it is called, Bob Ross harbours — the hobby version of a cosy game.',
     [
      ('How to lay a fire', 'October 12.', [SES('how to lay a fire that lights first time', '2026-10-12')], ['studio/hollow-pines']),
      ('Heat shimmer', 'October 13.', [SES('what is the wavy air above a fire called', '2026-10-13')]),
      ('Bob Ross harbours', 'October 22.', [SES('if bob ross painted harbours at dusk what would the palette be', '2026-10-22')], ['studio/media']),
     ], see=['studio/hollow-pines'])

page('play/travel', 'Travel for its own sake', 'trip', 'play', 'A spa inn in November 2025, cruise marketing, and a question about the biggest grape in Halvern.',
     [
      ('Lakeside inn', 'November 8–10, 2025.', [CAL('Stay at Lakeside Inn', '2025-11-08')], ['work/travel-2026']),
      ('Halvern', 'A trade-show trip and "biggest grape in Halvern" on the way home.', [CAL('Halvern Marine Expo', '2026-09-22'), SES('biggest grape in Halvern', '2026-09-25')]),
      ('Cruise mail', 'Promotions, November 2.', [GM('Open a second account, get a tote bag', '2026-11-02')]),
      ('Hotels and ferries', 'Among merchants; travel is its own category.', [BANK_MER, BANK_CAT], ['money/spending-shape']),
     ], see=['work/travel-2026'])

# ================================================================ PREFERENCES
page('preferences/iterative-refinement', 'Prefers iterative refinement', 'preference', 'pref', 'Sam refines creative work through concrete, successive change requests.',
     [('Concrete, successive changes', 'Voice, timing, structure and visual direction get adjusted one request at a time.', [WIKI('preferences/iterative-refinement', 'Prefers iterative refinement')], ['studio/vale-studio'])],
     see=['preferences/spoken-explanations'])
page('preferences/spoken-explanations', 'Often wants spoken explanations', 'preference', 'pref', 'Substantial explanations in spoken form, natural and human-sounding.',
     [('Narration over prose', 'Prefers narration for long explanations; a TTS tool was explored in October.', [WIKI('preferences/spoken-explanations', 'Often wants spoken explanations'), SES('text to speech for a picture book read-along', '2026-10-06')], ['studio/toolchain'])],
     see=['preferences/iterative-refinement'])
page('preferences/review-budget', 'Bounded automated reviews', 'preference', 'pref', 'Three automated review passes per pull request, then report remaining findings with dispositions.',
     [('Three passes, then dispositions', 'A hard cap keeps review loops finite.', [WIKI('preferences/review-budget', 'Bounded automated reviews')], ['studio/tidewatch', 'studio/ledgerline'])],
     see=['studio/toolchain'])
page('preferences/privacy-boundaries', 'Keeps private things private', 'preference', 'pref', 'Real data stays in private repos and previews; public versions are sanitized or fictional. Finances and mail enter maps as metadata only.',
     [('Sanitize before publishing', 'Public twins are fictional; private mail stays out.', [GH('mindblown-demo'), W_FOOT], ['home/footprint'])],
     see=['preferences/review-budget'])

# ================================================================ TRAIL
TRAIL = {
    '2026-09-14': ['tide times Port Ellery', 'Can you help me get my life in order? Money, Juno, the boat, the studio'],
    '2026-09-13': ['stop-motion chess where the pieces drift like boats'],
    '2026-09-17': ['Fancy a game of chess against us?', 'resize handheld case design to match pc case'],
    '2026-09-20': ['9 inch chartplotter comparison 2026'], '2026-09-21': ['which plotters read vector charts offline'],
    '2026-09-25': ['biggest grape in Halvern'], '2026-09-28': ['class b+ ais transponder splitter', 'ais silent mode legality'],
    '2026-09-29': ['donation link for a free game'], '2026-10-01': ['nmea 2000 backbone max length'], '2026-10-02': ['ultrasonic wind sensor vs cups small boat'],
    '2026-10-04': ['connect ai coding assistant to a private repo', 'how do i run a review bot on a pull request', 'studio logo brief: lantern, wave, pine', 'indie app payments provider comparison'],
    '2026-10-06': ['text to speech for a picture book read-along', 'wind sensor dropping off nmea bus'], '2026-10-07': ['best places to show a beta app'],
    '2026-10-08': ['Can my mum have her own cabin save on the family server?'], '2026-10-12': ['how to lay a fire that lights first time'], '2026-10-13': ['what is the wavy air above a fire called'],
    '2026-10-18': ['What is public about me online? Handles, old forum posts, race results'], '2026-10-19': ['small presses accepting illustrated picture book submissions'],
    '2026-10-20': ['can you clean up my mail?'], '2026-10-22': ['if bob ross painted harbours at dusk what would the palette be'], '2026-10-25': ['second video channel under the same studio login'],
    '2026-10-28': ['mastodon blood and thunder lyrics meaning', 'coding assistant lost the repo context again'], '2026-10-30': ['lightweight image viewer windows'],
    '2026-11-01': ['Assume the role of my head of marketing for Tidewatch and Hollow Pines'],
}
# map trail titles to existing session sources by label prefix
by_label = {m['label']: u for u, m in SOURCES.items() if m['kind'] == 'session'}
KEYMAP = [('chartplotter|plotters|ais|nmea|wind sensor', 'work/gear-research'), ('coding assistant|review bot|payments|logo|text to speech', 'studio/toolchain'),
          ('fire|bob ross', 'play/fire-and-sky'), ('chess', 'play/chess'), ('handheld|cabin save', 'play/gaming'), ('public about me|clean up my mail', 'home/footprint'),
          ('life in order|tide times', 'money/overview'), ('presses', 'studio/paper-moons'), ('youtube|image viewer', 'studio/media'), ('beta app|head of marketing|donation', 'studio/vale-studio'),
          ('blood and thunder', 'play/loud'), ('grape', 'play/travel')]
import re
for d, titles in sorted(TRAIL.items()):
    syns = []
    for t in titles:
        uri = by_label.get(f'{t[:48]} · {d}') or SES(t, d)
        links = [p for pat, p in KEYMAP if re.search(pat, t.lower())][:2]
        syns.append((t[:60], f'Search on {d}: "{t}".', [uri], links))
    page(f'trail/{d}', d, 'day', 'trail', f'{len(syns)} search{"es" if len(syns) != 1 else ""} on {d}.', syns, created=d, updated=d)

# ================================================================ assemble
ids = {p['id'] for p in PAGES}
for p in PAGES:
    for s in p['synapses']: s['links'] = [l for l in s['links'] if l in ids]
synapses = [s for p in PAGES for s in p['synapses']]
links = {}
def addlink(a, b, kind, note=None):
    if a == b or a not in ids or b not in ids: return
    k = tuple(sorted((a, b))); L = links.setdefault(k, {'s': k[0], 't': k[1], 'w': 0, 'kinds': [], 'notes': []})
    L['w'] += 1
    if kind not in L['kinds']: L['kinds'].append(kind)
    if note and note not in L['notes'] and len(L['notes']) < 3: L['notes'].append(note)
for p in PAGES:
    for t in SEEALSO[p['id']]: addlink(p['id'], t, 'see-also')
    for s in p['synapses']:
        for t in s['links']: addlink(p['id'], t, 'mention', s['lead'])
synLinks = [{'s': s['id'], 't': t} for s in synapses for t in s['links']]
pages_by_src = collections.defaultdict(list)
for p in PAGES:
    for u in p['sources']: pages_by_src[u].append(p['id'])
co = collections.Counter()
for u, ps in pages_by_src.items():
    if SOURCES[u]['kind'] == 'plaid': continue
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)): co[tuple(sorted((ps[i], ps[j])))] += 1
cocite = [{'s': a, 't': b, 'w': w} for (a, b), w in co.items()]
sources = [{'id': u, 'label': m['label'], 'kind': m['kind'], 'pages': pages_by_src[u]} for u, m in SOURCES.items() if pages_by_src.get(u)]
data = {'lobes': [{'id': l['id'], 'name': l['name'], 'color': l['color'], 'hidden': l.get('hidden', False)} for l in LOBES], 'center': SAM,
        'demo': True, 'title': 'MindBlown: Life', 'subtitle': 'demo life brain · fictional data', 'dayName': 'search day',
        'pages': PAGES, 'synapses': synapses, 'sources': sources, 'links': list(links.values()), 'synLinks': synLinks, 'cocite': cocite, 'built': TODAY}
with open(OUT, 'w', encoding='utf-8') as f: f.write('window.MINDBLOWN = ' + json.dumps(data, ensure_ascii=False) + ';\n')
kinds = collections.Counter(s['kind'] for s in sources)
subs = sum(1 for p in PAGES if p.get('parent'))
print(f'pages={len(PAGES)} (sub-neurons={subs}) synapses={len(synapses)} sources={len(sources)} links={len(links)} cocite={len(cocite)}', dict(kinds))

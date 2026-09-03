from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sekretny_klucz_awantury'
socketio = SocketIO(app)

QUESTIONS_DB = {
    "Archidiecezja Białostocka": [
        {"query": "Kto jest obecnym metropolitą białostockim?", "answer": "Abp Józef Guzdek"},
        {"query": "W którym roku powstała archidiecezja białostocka?", "answer": "1992"},
        {"query": "Jakiego wezwania jest białostocka katedra?", "answer": "Wniebowzięcia Najświętszej Maryi Panny"}
    ],
    "Paramenty liturgiczne": [
        {"query": "Do czego służy trybularz?", "answer": "Do okadzania (spalania kadzidła podczas liturgii)"},
        {"query": "Jak nazywa się naczynie do przechowywania konsekrowanych komunikantów w tabernakulum?", "answer": "Puszka (cyborium)"},
        {"query": "Co to jest puryfikaterz?", "answer": "Biały ręczniczek do wycierania i osuszania kielicha oraz pateny"}
    ],
    "Szaty liturgiczne": [
        {"query": "Jakiego koloru ornatu używa się w okresie Adwentu?", "answer": "Fioletowego (w III niedzielę fioletowego lub różowego)"},
        {"query": "Czym różni się kapa od ornatu?", "answer": "Kapa to peleryna zapinana pod szyją używana poza Mszą św., a ornat wkłada się przez głowę do Mszy św."},
        {"query": "Co symbolizuje humerał?", "answer": "Hełm zbawienia i powściągliwość w mowie / ochronę przed pokusami"}
    ],
    "Święta i uroczystości": [
        {"query": "W jaki dzień tygodnia zawsze przypada Uroczystość Bożego Ciała?", "answer": "W czwartek"},
        {"query": "Jakie święto kończy okres Bożego Narodzenia w tradycji polskiej?", "answer": "Święto Ofiarowania Pańskiego (Matki Bożej Gromnicznej - 2 lutego)"},
        {"query": "Co wspominamy w Wielki Czwartek?", "answer": "Ustanowienie sakramentów Eucharystii i Kapłaństwa"}
    ],
    "Budowa kościoła": [
        {"query": "Jak nazywa się miejsce przewodniczenia liturgii przez kapłana?", "answer": "Miejsce przewodniczenia (sedilia / katedra)"},
        {"query": "Gdzie w kościele przechowuje się Najświętszy Sakrament?", "answer": "W tabernakulum"},
        {"query": "Czym jest prezbiterium?", "answer": "Część kościoła wokół ołtarza przeznaczona dla duchowieństwa i służby liturgicznej"}
    ],
    "Sakramenty": [
        {"query": "Wymień trzy sakramenty wtajemniczenia chrześcijańskiego.", "answer": "Chrzest, bierzmowanie, Eucharystia"},
        {"query": "Kto jest zwyczajnym szafarzem sakramentu bierzmowania?", "answer": "Biskup"},
        {"query": "Które sakramenty można przyjąć tylko raz w życiu?", "answer": "Chrzest, bierzmowanie, sakrament święceń"}
    ],
    "Księgi liturgiczne": [
        {"query": "Z jakiej księgi diakon lub kapłan czyta Ewangelię podczas Mszy?", "answer": "Z Ewangeliarza (lub Lekcjonarza)"},
        {"query": "Jak nazywa się księga zawierająca modlitwy mszalne dla celebransa?", "answer": "Mszał Rzymski (Mszał)"},
        {"query": "Czym jest lekcjonarz?", "answer": "Księga zawierająca czytania biblijne na poszczególne dni"}
    ],
    "Postawy i gesty": [
        {"query": "Co oznacza postawa stojąca w liturgii?", "answer": "Szacunek, gotowość do służby, czuwanie i zmartwychwstanie"},
        {"query": "W których momentach Mszy Świętej wierni powinni klęczeć?", "answer": "Podczas przeistoczenia oraz podczas 'Oto Baranek Boży'"},
        {"query": "Co symbolizuje uderzenie się w piersi?", "answer": "Żal za grzechy, skruchę i uznanie swojej winy"}
    ],
    "Hierarchia kościelna": [
        {"query": "Kto jest głową całego Kościoła katolickiego?", "answer": "Papież (biskup Rzymu) / Jezus Chrystus"},
        {"query": "Wymień trzy stopnie sakramentu święceń.", "answer": "Diakonat, prezbiterat, episkopat"},
        {"query": "Czym zajmuje się Konferencja Episkopatu?", "answer": "Koordynacją działalności duszpasterskiej i podejmowaniem decyzji przez biskupów danego kraju"}
    ],
    "Czarna Skrzynka": [
        {"query": "Co kryje się w czarnej skrzynce? (Pytanie specjalne)", "answer": "Niespodzianka przygotowana przez prowadzącego!"},
        {"query": "Kto z drużyny zje plaster cytryny bez krzywienia się?", "answer": "Zadanie zręcznościowe dla wybranego uczestnika"}
    ]
}

game_state = {
    'teams': {}, 
    'bids': {}, 
    'pool': 0,
    'current_category': "Oczekiwanie na start...",
    'current_question': "",
    'current_answer': "",
    'show_answer': False,
    'is_spinning': False
}

@app.route('/')
def widownia():
    return render_template('widownia.html')

@app.route('/admin')
def admin():
    return render_template('admin.html', categories=QUESTIONS_DB)

@socketio.on('connect')
def handle_connect():
    emit('update_state', game_state)

@socketio.on('admin_action')
def handle_admin_action(data):
    global game_state
    action = data.get('action')
    team = data.get('team')
    
    try:
        amount = int(data.get('amount', 0))
    except ValueError:
        amount = 0

    if action == 'setup':
        selected_teams = data.get('teams', [])
        game_state['teams'] = {t: amount for t in selected_teams}
        game_state['bids'] = {t: 0 for t in selected_teams}
        game_state['pool'] = 0
        game_state['current_category'] = "Nowa gra rozpoczęta!"
        game_state['current_question'] = ""
        game_state['current_answer'] = ""
        game_state['show_answer'] = False
        game_state['is_spinning'] = False

    elif action == 'spin_wheel':
        chosen_category = random.choice(list(QUESTIONS_DB.keys()))
        game_state['current_category'] = chosen_category
        game_state['current_question'] = ""
        game_state['current_answer'] = ""
        game_state['show_answer'] = False
        game_state['is_spinning'] = True
        socketio.emit('spin_animation', {'target_category': chosen_category})

    elif action == 'start_round':
        game_state['is_spinning'] = False # Wyłączamy koło, wchodzi pula i licytacja
        fee = amount
        for t in game_state['teams']:
            if game_state['teams'][t] >= fee:
                game_state['teams'][t] -= fee
                game_state['pool'] += fee
            else:
                game_state['pool'] += game_state['teams'][t]
                game_state['teams'][t] = 0
            game_state['bids'][t] = 0
        game_state['current_question'] = "" # Pytania brak dopóki trwa licytacja
        game_state['current_answer'] = ""
        game_state['show_answer'] = False

    elif action == 'bid' and team in game_state['teams']:
        current_bid = game_state['bids'].get(team, 0)
        delta = amount - current_bid 
        if delta > 0 and game_state['teams'][team] >= delta:
            game_state['teams'][team] -= delta
            game_state['bids'][team] = amount
            game_state['pool'] += delta

    elif action == 'all_in' and team in game_state['teams']:
        available_funds = game_state['teams'][team]
        current_bid = game_state['bids'].get(team, 0)
        if available_funds > 0:
            game_state['teams'][team] = 0
            game_state['bids'][team] = current_bid + available_funds
            game_state['pool'] += available_funds
            
    elif action == 'add' and team in game_state['teams']:
        game_state['teams'][team] += amount
        
    elif action == 'win_pool' and team in game_state['teams']:
        game_state['teams'][team] += game_state['pool']
        game_state['pool'] = 0
        for t in game_state['bids']:
            game_state['bids'][t] = 0
        game_state['current_question'] = f"Wygrywają {team.upper()}!"
        game_state['current_answer'] = ""
        game_state['show_answer'] = False

    elif action == 'wrong_answer':
        for t in game_state['bids']:
            game_state['bids'][t] = 0
        game_state['current_question'] = "ZŁA ODPOWIEDŹ! Pula przechodzi do kolejnego pytania!"
        game_state['current_answer'] = ""
        game_state['show_answer'] = False
            
    elif action == 'show_question':
        game_state['is_spinning'] = False
        question = data.get('question', '')
        answer = data.get('answer', '')
        if not answer and question:
            for cat, items in QUESTIONS_DB.items():
                for item in items:
                    if isinstance(item, dict) and item.get('query') == question:
                        answer = item.get('answer', '')
                        break
                if answer:
                    break
        game_state['current_question'] = question
        game_state['current_answer'] = answer
        game_state['show_answer'] = bool(data.get('show_answer', False))

    elif action in ('toggle_answer', 'show_answer'):
        if data.get('question') and not game_state.get('current_question'):
            game_state['current_question'] = data.get('question')
        if data.get('answer') and not game_state.get('current_answer'):
            game_state['current_answer'] = data.get('answer')
            
        if not game_state.get('current_answer') and game_state.get('current_question'):
            cur_q = game_state['current_question']
            for cat, items in QUESTIONS_DB.items():
                for item in items:
                    if isinstance(item, dict) and item.get('query') == cur_q:
                        game_state['current_answer'] = item.get('answer', '')
                        break
                if game_state.get('current_answer'):
                    break

        if action == 'toggle_answer':
            game_state['show_answer'] = not game_state.get('show_answer', False)
        else:
            game_state['show_answer'] = bool(data.get('show', True))

    socketio.emit('update_state', game_state)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
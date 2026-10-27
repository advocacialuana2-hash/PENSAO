from app import cnj
from tests.conftest import numero_valido


def test_valida_e_formata():
    n = cnj.interpretar(numero_valido())
    assert n is not None
    assert n.tribunal == "TJSP"
    assert cnj.interpretar(n.digitos).formatado == n.formatado


def test_rejeita_digito_errado():
    certo = numero_valido()
    dd = int(certo[8:10])
    errado = f"{certo[:8]}{(dd + 1) % 100:02d}{certo[10:]}"
    assert cnj.interpretar(errado) is None


def test_soma_modulo_97_iso7064():
    n = cnj.interpretar(numero_valido())
    reordenado = f"{n.sequencial}{n.ano}{n.segmento}{n.tribunal_codigo}{n.origem}{n.digito}"
    assert int(reordenado) % 97 == 1


def test_identifica_segmentos():
    casos = {
        ("8", "19"): "TJRJ", ("8", "07"): "TJDF", ("8", "27"): "TJTO",
        ("5", "02"): "TRT2", ("5", "00"): "TST", ("4", "06"): "TRF6",
        ("4", "07"): None, ("6", "13"): "TRE-MG", ("9", "26"): "TJMSP", ("3", "00"): "STJ",
    }
    for (j, tr), esperado in casos.items():
        assert cnj.identificar_tribunal(j, tr) == esperado


def test_encontra_varios_sem_repetir():
    a = numero_valido()
    b = numero_valido(seq="7654321", j="5", tr="02", origem="0001")
    texto = f"Processo {a}. Apenso {b}. Novamente {a} e lixo 1234567-00.2024.8.26.0100"
    achados = cnj.encontrar_todos(texto)
    assert [x.formatado for x in achados] == [a, b]
    assert achados[1].tribunal == "TRT2"

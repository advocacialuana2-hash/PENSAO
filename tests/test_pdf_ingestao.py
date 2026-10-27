import os
import time

from app import ingestao, pdf
from tests.conftest import criar_pdf, numero_valido


def test_analise_extrai_numero_e_tipo(tmp_path):
    n = numero_valido()
    arq = criar_pdf(tmp_path / "p.pdf", ["EXCELENTISSIMO SENHOR DOUTOR JUIZ", f"Processo n. {n}",
                                         "CONTRARRAZOES DE APELACAO".replace("CONTRARRAZOES", "CONTRARRAZÕES")])
    a = pdf.analisar(arq, limite_mb=10)
    assert [x.formatado for x in a.numeros_cnj] == [n]
    assert a.tipo_sugerido == "Contrarrazões"
    assert a.paginas == 1 and not a.bloqueante


def test_bloqueia_arquivo_grande_e_corrompido(tmp_path):
    arq = criar_pdf(tmp_path / "p.pdf", [f"Processo {numero_valido()}"])
    assert pdf.analisar(arq, limite_mb=0.0001).bloqueante
    ruim = tmp_path / "ruim.pdf"
    ruim.write_bytes(b"isto nao e um pdf")
    assert pdf.analisar(ruim, limite_mb=10).bloqueante


def test_varredura_ingere_uma_vez_e_marca_duplicado(cfg, banco):
    entrada = cfg.pastas_entrada[0]
    arq = criar_pdf(entrada / "manifestacao.pdf", ["MANIFESTAÇÃO", f"Autos {numero_valido()}"])
    antigo = time.time() - 60
    os.utime(arq, (antigo, antigo))
    novos = ingestao.varrer(cfg, banco)
    assert len(novos) == 1
    assert ingestao.varrer(cfg, banco) == []  # não reprocessa o mesmo arquivo
    envio = banco.envio(novos[0])
    assert envio["tribunal"] == "TJSP" and envio["tipo"] == "Manifestação"

    copia = entrada / "copia.pdf"
    copia.write_bytes(arq.read_bytes())
    os.utime(copia, (antigo, antigo))
    (segundo,) = ingestao.varrer(cfg, banco)
    assert any(a.startswith("DUPLICADO") for a in banco.envio(segundo)["alertas"])


def test_ignora_arquivo_ainda_sendo_copiado(cfg, banco):
    criar_pdf(cfg.pastas_entrada[0] / "novo.pdf", [f"Autos {numero_valido()}"])
    assert ingestao.varrer(cfg, banco) == []

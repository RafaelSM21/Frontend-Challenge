import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, BookOpen, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";

export const Route = createFileRoute("/aprenda")({ component: AprendaPage });

type LearnCategory = "Todos" | "Começando" | "Colecionadores" | "Criadores" | "Segurança";
type LearnArticle = {
  id: string;
  category: Exclude<LearnCategory, "Todos">;
  title: string;
  summary: string;
  readTime: string;
  image: string;
  body: string[];
  takeaway: string;
};

const categories: LearnCategory[] = ["Todos", "Começando", "Colecionadores", "Criadores", "Segurança"];
const articles: LearnArticle[] = [
  {
    id: "nft-basico", category: "Começando", title: "NFT sem mistério: o que você realmente está comprando?",
    summary: "Entenda o token, a obra digital e o que a compra garante — sem complicar o assunto.", readTime: "5 min",
    image: "/nfts/NFT%20Artwork%2005.png",
    body: ["NFT é um registro digital único em uma blockchain. Ele pode apontar para uma obra, um item de jogo, um ingresso ou outro ativo digital.", "Comprar um NFT não significa automaticamente adquirir os direitos autorais da imagem. Esses direitos dependem dos termos definidos pelo criador ou pela coleção.", "Antes de comprar, confira a coleção, o endereço do contrato quando disponível, a página do criador e as condições de uso."],
    takeaway: "Pense no NFT como um certificado digital: leia o que ele representa antes de decidir."
  },
  {
    id: "carteira", category: "Começando", title: "Sua primeira carteira digital",
    summary: "Para que serve uma carteira, como guardar sua frase de recuperação e o que nunca compartilhar.",
    readTime: "6 min", image: "/nfts/NFT%20Artwork%2003.png",
    body: ["Uma carteira permite gerenciar endereços e assinar transações. Em geral, ela não guarda a arte em si: registra e autoriza movimentações associadas aos seus ativos.", "A frase de recuperação dá acesso à carteira. Guarde-a offline em um local seguro e nunca a envie por mensagem, formulário ou para alguém que diga ser do suporte.", "Use apenas extensões e aplicativos obtidos nos canais oficiais. Confira a rede e o endereço antes de confirmar uma transação."],
    takeaway: "Quem possui sua frase de recuperação pode controlar seus ativos. A Kurio nunca precisa dela."
  },
  {
    id: "colecao", category: "Colecionadores", title: "Como avaliar uma coleção antes de comprar",
    summary: "Aprenda a observar procedência, atividade do criador, utilidade e sinais de alerta.",
    readTime: "4 min", image: "/nfts/NFT%20Artwork%2004.png",
    body: ["Comece pela origem: visite o perfil do artista, compare links oficiais e verifique se a coleção corresponde àquela divulgada pelo criador.", "Leia a descrição e os termos. Volume, preço e raridade isoladamente não garantem qualidade, autenticidade nem valorização futura.", "Desconfie de urgência artificial, promessas de lucro garantido, links inesperados e pedidos para assinar transações que você não entende."],
    takeaway: "Faça sua própria pesquisa. NFTs podem perder valor e não há retorno garantido."
  },
  {
    id: "cunhagem", category: "Criadores", title: "Da arte à blockchain: entendendo a cunhagem",
    summary: "O que acontece ao transformar uma criação em um token e quais detalhes preparar antes de publicar.",
    readTime: "7 min", image: "/nfts/NFT%20Artwork%2010.png",
    body: ["Cunhar é registrar um token na blockchain. O processo pode envolver uma taxa de rede, dependendo da blockchain e do método utilizado.", "Antes de publicar, prepare o arquivo final, o título, a descrição, os atributos e os termos de uso. Use apenas conteúdo sobre o qual você tem os direitos necessários.", "Revise a rede, os custos e todos os dados antes de confirmar. Depois, mantenha os links oficiais da coleção organizados para seu público."],
    takeaway: "Uma apresentação clara e informações verificáveis ajudam o público a entender seu trabalho."
  },
  {
    id: "direitos", category: "Criadores", title: "NFT e direitos autorais não são a mesma coisa",
    summary: "Como comunicar com clareza o que o colecionador recebe junto com a obra.",
    readTime: "5 min", image: "/nfts/NFT%20Artwork%2005.png",
    body: ["A titularidade de um token não transfere automaticamente os direitos autorais da obra associada.", "O criador deve explicar quais usos são permitidos: exibição pessoal, uso comercial, licenciamento ou outras condições específicas.", "Deixe os termos acessíveis antes da compra e procure orientação jurídica quando for definir uma licença comercial."],
    takeaway: "Explique os direitos concedidos em linguagem simples e por escrito."
  },
  {
    id: "golpes", category: "Segurança", title: "5 sinais de alerta para evitar golpes com NFTs",
    summary: "Links falsos, suporte que pede segredo, promessas de lucro e outras armadilhas comuns.",
    readTime: "4 min", image: "/nfts/NFT%20Artwork%2003.png",
    body: ["Nunca compartilhe sua frase de recuperação ou chave privada, mesmo que a pessoa alegue trabalhar na plataforma.", "Confira o endereço do site antes de conectar sua carteira. Evite links recebidos inesperadamente e anúncios que imitam projetos conhecidos.", "Leia a solicitação da carteira com atenção. Se não entender o que está autorizando, cancele e procure a documentação oficial por conta própria."],
    takeaway: "Pare, confira por outro canal e não assine uma transação sob pressão."
  },
];

function AprendaPage() {
  const [category, setCategory] = useState<LearnCategory>("Todos");
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("assunto") ?? "";
  });
  const [activeArticle, setActiveArticle] = useState<LearnArticle | null>(null);
  const filteredArticles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return articles.filter((article) =>
      (category === "Todos" || article.category === category) &&
      (!term || `${article.title} ${article.summary} ${article.category}`.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [category, search]);

  return (
    <main className="learn-page site-wrap" id="conteudo">
      <section className="learn-hero container">
        <div className="learn-hero-copy">
          <span className="learn-eyebrow"><BookOpen size={15} /> CENTRAL DE CONHECIMENTO KURIO</span>
          <h1>Descubra. <em>Entenda.</em><br />Colecione com confiança.</h1>
          <p>Guias diretos para explorar NFTs, proteger sua carteira e dar os próximos passos como artista ou colecionador.</p>
          <a className="learn-hero-link" href="#biblioteca">EXPLORAR CONTEÚDOS <ArrowDownRight size={17} /></a>
        </div>
        <div className="learn-hero-art" aria-hidden="true">
          <div className="learn-orbit learn-orbit-one" />
          <div className="learn-orbit learn-orbit-two" />
          <div className="learn-book-mark"><Sparkles size={27} /><span>K.</span><small>APRENDA NO SEU RITMO</small></div>
        </div>
      </section>

      <section className="learn-paths container" aria-label="Trilhas de aprendizado">
        <Link to="/mercado" className="learn-path-card"><span className="learn-path-icon"><Wallet size={21} /></span><span><strong>Quero colecionar</strong><small>Conheça NFTs, carteiras e como pesquisar uma coleção.</small></span><ArrowRight size={18} /></Link>
        <Link to="/criadores" className="learn-path-card"><span className="learn-path-icon"><Sparkles size={21} /></span><span><strong>Quero criar</strong><small>Aprenda sobre cunhagem, apresentação e direitos da obra.</small></span><ArrowRight size={18} /></Link>
        <a href="#seguranca" className="learn-path-card"><span className="learn-path-icon"><ShieldCheck size={21} /></span><span><strong>Quero me proteger</strong><small>Veja boas práticas para manter sua carteira segura.</small></span><ArrowRight size={18} /></a>
      </section>

      <section className="learn-library container" id="biblioteca">
        <header className="learn-section-heading">
          <div><span className="learn-eyebrow">DIÁRIO DA CUNHAGEM</span><h2>Conhecimento que <em>abre caminhos.</em></h2><p>Conteúdo prático para tomar decisões mais conscientes no universo digital.</p></div>
          <label className="learn-search"><span className="sr-only">Buscar artigos</span><input type="search" placeholder="Buscar um assunto..." value={search} onChange={(event) => setSearch(event.target.value)} /><span aria-hidden="true">⌕</span></label>
        </header>
        <div className="learn-filters" aria-label="Filtrar por assunto">
          {categories.map((item) => <button type="button" key={item} className={category === item ? "is-active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {activeArticle && <section className="learn-article-reader" aria-labelledby="learn-reader-title">
          <button className="learn-reader-close" type="button" aria-label="Fechar artigo" onClick={() => setActiveArticle(null)}><X size={18} /></button>
          <span className="learn-article-category">{activeArticle.category} · LEITURA DE {activeArticle.readTime.toUpperCase()}</span>
          <h2 id="learn-reader-title">{activeArticle.title}</h2>
          {activeArticle.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="learn-takeaway"><strong>PARA LEMBRAR</strong><p>{activeArticle.takeaway}</p></div>
        </section>}
        {filteredArticles.length ? <div className="learn-article-grid">{filteredArticles.map((article, index) => <article className={`learn-article-card${index === 0 ? " learn-article-featured" : ""}`} key={article.id}>
          <div className="learn-article-image"><img src={article.image} alt="" loading="lazy" /><span>{article.category}</span></div>
          <div className="learn-article-content"><small>LEITURA DE {article.readTime.toUpperCase()}</small><h3>{article.title}</h3><p>{article.summary}</p><button type="button" onClick={() => { setActiveArticle(article); document.getElementById("biblioteca")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>LER ARTIGO <ArrowRight size={15} /></button></div>
        </article>)}</div> : <div className="learn-empty"><BookOpen size={24} /><strong>Nenhum conteúdo encontrado</strong><p>Tente outro termo ou selecione uma categoria diferente.</p><button type="button" onClick={() => { setSearch(""); setCategory("Todos"); }}>Limpar filtros</button></div>}
      </section>

      <section className="learn-safety container" id="seguranca">
        <div className="learn-safety-icon"><ShieldCheck size={30} /></div>
        <div><span className="learn-eyebrow">SEGURANÇA EM PRIMEIRO LUGAR</span><h2>Se parece urgente demais, <em>desconfie.</em></h2><p>Nunca compartilhe sua frase de recuperação, confira links antes de conectar sua carteira e não assine transações que você não entende. Conteúdo educativo não é recomendação financeira.</p></div>
        <a href="#biblioteca" onClick={() => { setCategory("Segurança"); setSearch(""); }}>VER GUIAS DE SEGURANÇA <ArrowRight size={16} /></a>
      </section>
      <section className="learn-bottom-cta container"><div><span className="learn-eyebrow">SEU PRÓXIMO PASSO</span><h2>Aprendeu o básico? Explore o universo Kurio.</h2><p>Descubra coleções e artistas, sempre no seu ritmo.</p></div><div><Link to="/mercado">EXPLORAR MERCADO <ArrowRight size={16} /></Link><Link to="/criadores">CONHECER CRIADORES <ArrowRight size={16} /></Link></div></section>
    </main>
  );
}

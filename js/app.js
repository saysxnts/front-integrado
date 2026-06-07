const API_URL = "https://ler-e-educar-api.onrender.com/api"; // Substitua pelo link gerado no seu Render
let listaLivrosGlobal = []; // Variável global para armazenar os livros vindo da API

// Executa automaticamente assim que a página é carregada
document.addEventListener("DOMContentLoaded", () => {
    carregarLivrosDaAPI();
});

// Função assíncrona para buscar os livros no seu back-end hospedado no Render
async function carregarLivrosDaAPI() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Sessão inválida ou expirada. Por favor, faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/livros`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Passagem do Token JWT exigido pelo SecurityConfig
                'Content-Type': 'application/json'
            }
        });

        if (resposta.ok) {
            listaLivrosGlobal = await resposta.json();
            mostrarLivros(listaLivrosGlobal);
        } else if (resposta.status === 401 || resposta.status === 403) {
            alert("Sessão expirada. Redirecionando para a tela de login.");
            localStorage.removeItem("token");
            window.location.href = "login.html";
        } else {
            console.error("Erro ao buscar catálogo de livros. Status:", resposta.status);
        }
    } catch (erro) {
        console.error("Erro na comunicação com a API do Render:", erro);
        alert("Não foi possível conectar ao servidor. Verifique se o seu Web Service no Render está ativo.");
    }
}

// Renderiza os cartões de livro dinamicamente na página
function mostrarLivros(listaLivros) {
    const lista = document.getElementById("lista-livros");
    if (!lista) return;

    lista.innerHTML = "";

    if (listaLivros.length === 0) {
        lista.innerHTML = "<p>Nenhum livro disponível no catálogo no momento.</p>";
        return;
    }

    listaLivros.forEach(livro => {
        // Mapeado de acordo com o DTO LivroResponse retornado pelo seu Spring Boot
        lista.innerHTML += `
            <div class="livro-card">
                <h3>${livro.titulo}</h3>
                <p><strong>Autor:</strong> ${livro.autor}</p>
                <p><strong>Categoria:</strong> ${livro.categoria}</p>
                <p><strong>Disponíveis:</strong> ${livro.totalDisponiveis !== undefined ? livro.totalDisponiveis : 'Consultar'}</p>
            </div>
        `;
    });
}

// Filtra os livros salvos em memória por categoria
function filtrarLivros(categoria) {
    if (categoria === "Todos" || !categoria) {
        mostrarLivros(listaLivrosGlobal);
        return;
    }

    const filtrados = listaLivrosGlobal.filter(livro =>
        livro.categoria === categoria
    );

    mostrarLivros(filtrados);
}

// =========================================================================
// FUNÇÕES DE INTERFACE (UI) MANTIDAS EXATAMENTE COMO NO SEU ORIGINAL
// =========================================================================

function abrirModal() {
    document.getElementById("modal-livro").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal-livro").style.display = "none";

    // Reseta o estado do Ver Mais
    const textoCompleto = document.getElementById("texto-completo");
    const btnLerMais = document.getElementById("btn-ler-mais");
    if(textoCompleto && btnLerMais) {
        textoCompleto.style.display = "none";
        btnLerMais.innerText = "(Ver Mais)";
    }
}

function toggleMenu() {
    const menu = document.getElementById("menu-lateral");
    if (menu) menu.classList.toggle("aberto");
}

// Evento para fechar o menu automaticamente ao clicar fora dele
document.addEventListener('click', function(event) {
    const menu = document.getElementById('menu-lateral');
    const hamburguer = document.querySelector('.menu-hamburguer');

    if (menu && menu.classList.contains('aberto')) {
        /* MÁGICA DO FECHAMENTO AUTOMÁTICO:
           Se o clique NÃO foi dentro do menu lateral E NÃO foi no botão hambúrguer,
           significa que o usuário clicou na área vazia da página. Então fechamos o menu!
        */
        if (!menu.contains(event.target) && !hamburguer.contains(event.target)) {
            menu.classList.remove('aberto');
        }
    }
});

function expandirTexto() {
    const textoCompleto = document.getElementById("texto-completo");
    const btnLerMais = document.getElementById("btn-ler-mais");

    if (!textoCompleto || !btnLerMais) return;

    // Se o texto estiver escondido, mostra ele
    if (textoCompleto.style.display === "none" || textoCompleto.style.display === "") {
        textoCompleto.style.display = "inline";
        btnLerMais.innerText = "(Ver Menos)";
    } else {
        // Se já estiver aberto, esconde de novo ao clicar
        textoCompleto.style.display = "none";
        btnLerMais.innerText = "(Ver Mais)";
    }
}
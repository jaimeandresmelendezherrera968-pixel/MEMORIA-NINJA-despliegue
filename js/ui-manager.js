export const UIManager = {
    renderPlayers(players) {
        const left = document.getElementById('playerLeft');
        const right = document.getElementById('playerRight');

        if (left) {
            left.innerHTML = `<h3>${players.p1.name}</h3><p>Chakra: ${players.p1.chakra}%</p>`;
        }
        if (right) {
            right.innerHTML = `<h3>${players.p2.name}</h3><p>Chakra: ${players.p2.chakra}%</p>`;
        }
    }
};
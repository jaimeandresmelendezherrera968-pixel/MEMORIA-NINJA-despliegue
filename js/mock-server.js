export const MockServer = {
    state: {
        room: { id: "NINJA-99", status: "PLAYING" },
        players: {
            p1: { name: "Sasuke", chakra: 80, score: 20, avatar: "assets/img/sasuke.png" },
            p2: { name: "Naruto", chakra: 65, score: 10, avatar: "assets/img/naruto.png" }
        }
    },
    getData() { return this.state; }
};
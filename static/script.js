let linkCount = 0;


/* -----------------------------
   ADD ARENA INPUT
----------------------------- */

function addLink(value = "") {

    linkCount++;

    const container =
        document.getElementById("links");

    const row =
        document.createElement("div");

    row.className = "link-row";

    row.innerHTML = `
        <input
            type="url"
            placeholder="https://www.chess.com/arena/..."
            value="${value}"
        >

        <button
            class="remove"
            onclick="this.parentElement.remove()"
        >
            ×
        </button>
    `;

    container.appendChild(row);
}


/* -----------------------------
   GET LINKS
----------------------------- */

function getLinks() {

    return [
        ...document.querySelectorAll(
            "#links input"
        )
    ]
    .map(input => input.value.trim())
    .filter(Boolean);
}


/* -----------------------------
   ANALYZE
----------------------------- */

async function analyze() {

    const links = getLinks();

    const status =
        document.getElementById("status");

    if (!links.length) {

        status.innerHTML = `
            <div class="status">
                ⚠️ Add at least one Arena link.
            </div>
        `;

        return;
    }

    status.innerHTML = `
        <div class="status">
            ⏳ Analyzing ${links.length} Arena(s)...
        </div>
    `;

    try {

        const response =
            await fetch("/api/analyze", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    links: links
                })
            });


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error ||
                "Analysis failed."
            );
        }


        renderResults(data);


        status.innerHTML = `
            <div class="status">
                ✅ Analysis complete!
            </div>
        `;

    } catch (error) {

        status.innerHTML = `
            <div class="status">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;
    }
}


/* -----------------------------
   RENDER EVERYTHING
----------------------------- */

function renderResults(data) {

    document
        .getElementById("results")
        .classList.remove("hidden");


    document
        .getElementById("grandTotal")
        .textContent =
        formatNumber(data.grand_total);


    renderArenas(data.arenas);

    renderPlayers(
        data.players,
        data.arenas
    );

    renderClubs(
        data.clubs,
        data.arenas
    );
}


/* -----------------------------
   ARENA RESULTS
----------------------------- */

function renderArenas(arenas) {

    const container =
        document.getElementById(
            "arenaResults"
        );

    container.innerHTML = "";


    arenas.forEach(arena => {

        let rows = "";

        arena.participants.forEach(
            (player, index) => {

                rows += `
                    <tr>
                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeHtml(
                                player.username
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                player.club
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                player.points
                            )}
                        </td>
                    </tr>
                `;
            }
        );


        container.innerHTML += `

            <div class="arena">

                <div class="arena-title">

                    <strong>
                        ${escapeHtml(
                            arena.name
                        )}
                    </strong>

                    <a
                        href="${escapeHtml(
                            arena.url
                        )}"
                        target="_blank"
                        rel="noopener"
                    >
                        Open Arena ↗
                    </a>

                </div>


                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Club</th>
                                <th>Points</th>
                            </tr>

                        </thead>

                        <tbody>
                            ${rows}
                        </tbody>

                    </table>

                </div>

            </div>
        `;
    });
}


/* -----------------------------
   PLAYER RESULTS
----------------------------- */

function renderPlayers(
    players,
    arenas
) {

    const tbody =
        document.getElementById(
            "playerResults"
        );

    const header =
        document.getElementById(
            "playerArenaHeaders"
        );


    header.innerHTML = arenas
        .map(
            arena =>
                `<span>
                    Arena ${arena.arena_number}
                </span>`
        )
        .join(" / ");


    tbody.innerHTML = "";


    players.forEach(
        (player, index) => {

            const arenaScores =
                arenas.map(arena => {

                    const score =
                        player.arenas[
                            String(
                                arena.arena_number
                            )
                        ] ?? 0;

                    return `
                        <span>
                            ${formatNumber(score)}
                        </span>
                    `;
                }).join(" / ");


            tbody.innerHTML += `

                <tr>

                    <td class="rank">
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(
                            player.username
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            player.club
                        )}
                    </td>

                    <td>
                        ${arenaScores}
                    </td>

                    <td>
                        ${formatNumber(
                            player.total
                        )}
                    </td>

                </tr>
            `;
        }
    );
}


/* -----------------------------
   CLUB RESULTS
----------------------------- */

function renderClubs(
    clubs,
    arenas
) {

    const tbody =
        document.getElementById(
            "clubResults"
        );

    tbody.innerHTML = "";


    clubs.forEach(
        (club, index) => {

            const arenaScores =
                arenas.map(arena => {

                    const score =
                        club.arenas[
                            String(
                                arena.arena_number
                            )
                        ] ?? 0;

                    return `
                        <span>
                            ${formatNumber(score)}
                        </span>
                    `;

                }).join(" / ");


            tbody.innerHTML += `

                <tr>

                    <td class="rank">
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(
                            club.club
                        )}
                    </td>

                    <td>
                        ${arenaScores}
                    </td>

                    <td>
                        ${formatNumber(
                            club.total
                        )}
                    </td>

                </tr>
            `;
        }
    );
}


/* -----------------------------
   HELPERS
----------------------------- */

function formatNumber(number) {

    const value =
        Number(number);

    if (
        Number.isInteger(value)
    ) {
        return value.toString();
    }

    return value.toFixed(2);
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* -----------------------------
   INITIAL INPUT
----------------------------- */

addLink();
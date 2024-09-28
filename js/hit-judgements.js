const HIT_JUDGEMENT_WIDTH = 4;




function createHitJudgement(type, positionPercentage) {
    const element = document.createElement("div");

    element.classList.add("hj-" + type);
    element.classList.add("hide");

    element.style.left = `calc(${positionPercentage}% - ${HIT_JUDGEMENT_WIDTH / 2}px)`;

    return element;
}

/**
 * @param {HTMLElement | undefined | null} root
 * @param {"100" | "50" | "sb" | "x"} type
 * @param {number} positionPercentage From interval <0; 100>
 * @return {void}
 */
export function hitJudgementsAdd(root, type, positionPercentage) {
    if (root === undefined || root === null) {
        return;
    }

    const judgement = createHitJudgement(type, positionPercentage);
    root.appendChild(judgement);

    setTimeout(() => {
        judgement.classList.remove("hide");
    }, 50);
}

/**
 * @param {HTMLElement | undefined | null} root
 * @return {void}
 */
export async function hitJudgementsClear(root) {
    if (root === undefined || root === null) {
        return;
    }

    for (const child of root.children) {
        child.classList.add("hide");
    }

    setTimeout(() => {
        root.textContent = "";
    }, 250);
}
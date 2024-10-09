const HIT_JUDGEMENT_WIDTH = 4;




function createHitJudgement(type, positionPercentage, isSliderBreak) {
    const element = document.createElement("div");

    element.classList.add("hj-" + type);
    element.classList.add("hide");

    if (isSliderBreak) {
        element.classList.add("hj-sb");
    }

    element.style.left = `calc(${positionPercentage}% - ${HIT_JUDGEMENT_WIDTH / 2}px)`;

    return element;
}

/**
 * @param {HTMLElement | undefined | null} root
 * @param {"100" | "50" | "sb" | "x"} type
 * @param {number} positionPercentage From interval <0; 100>
 * @param {boolean} isSliderBreak
 * @return {void}
 */
export function hitJudgementsAdd(root, type, positionPercentage, isSliderBreak = false) {    
    if (root === undefined || root === null) {
        return;
    }

    const judgement = createHitJudgement(type, positionPercentage, isSliderBreak);
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
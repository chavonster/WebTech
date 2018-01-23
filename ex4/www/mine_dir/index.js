const FIRST = '0', SECOND = '1', RESET = 'reset',
      TITLE = 'Ex4';
const DEFAULT_RESULT = 'You have to play first.';


/**
 * hides one page and shows another (using css).
 * both should be strings that specify ids of elements. if there exists
 * a navbar item for them, it changes the page to show it as active as well.
 * @param  {string} oldPage name of the page to hide
 * @param  {string} newPage name of the page to show
 */
function switchPage(oldPage, newPage) {
    // reset result
    $('#result').text(DEFAULT_RESULT);

    // change title (capitalize first)
    $('head > title')
        .text(`${newPage[0].toUpperCase() + newPage.slice(1)} | ${TITLE}`);

    // change visibility
    $(`#${oldPage}`).removeClass('visible').addClass('hidden');
    $(`#${newPage}`).addClass('visible').removeClass('hidden');

    // change navbar
    $(`\.${oldPage}`).removeClass('active');
    $(`\.${newPage}`).addClass('active');
}


/**
 * returns the results as html
 * @param  {object} results must have ones and zeros fields
 */
function writeResults(results) {
    return `Number of '0's is ${results.zeros}. <br>` +
           `Number of '1's is ${results.ones}.`;
}


/**
 * checks if the user won and returns an appropriate response (as html).
 * @param  {object} results the results object
 * @param  {string} choice  the user's choice ('0', '1' or 'reset')
 * @return {string}         html of the response to show
 */
function checkWin(results, choice) {
    let response = '';

    if (choice == RESET) {
        return 'A new game has started.';
    } else if (results.ones > results.zeros && choice == FIRST ||
               results.ones < results.zeros && choice == SECOND) {
        response = 'You have won.';
    } else if (results.ones < results.zeros && choice == FIRST ||
               results.ones > results.zeros && choice == SECOND) {
        response = 'You have lost.';
    } else {
        response = "It's a tie...";
    }
    response += '<br>' + writeResults(results);
    return response;
}


/**
 * called when one of the 3 buttons is clicked.
 * sends a request to the server and shows results when the server sends them.
 * @param  {string} val the user's choice ('0', '1' or 'reset')
 */
function handleClick(val) {
    // specify the request method
    let method = 'POST';
    if (val == RESET) {
        method = 'DELETE';
    }

    $.ajax({
        type: method,
        // use the /gamble/:option api
        url: `/gamble/${val}`,
        // upon response, update the web page (show results)
        success: (result) => {
            switchPage('home', 'results');
            $('#result').html(checkWin(result, val));
        }
    });
}

// reset the page
$(document).ready(() => {
    switchPage('results', 'home');
});

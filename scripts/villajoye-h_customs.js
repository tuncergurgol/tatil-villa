/* =========================
   TEXT CAPITALIZE (jQuery)
========================= */
$('.h_firstcap').keyup(function () {
    var txt = $(this).val();
    $(this).val(
        txt.replace(/^(.)|\s(.)/g, function (match) {
            return match.toUpperCase();
        })
    );
});


/* =========================
   NUMBER ONLY INPUT
========================= */
function h_isNumber(evt) {
    evt = evt || window.event;
    var charCode = evt.which || evt.keyCode;

    return !(charCode > 31 && (charCode < 48 || charCode > 57));
}


/* =========================
   COOKIE ALERT
========================= */
(function () {
    var cookieAlert = document.querySelector(".cookiealert");
    var acceptBtn = document.querySelector(".acceptcookies");

    if (!cookieAlert || !acceptBtn) return;

    function getCookie(name) {
        return document.cookie
            .split("; ")
            .find(row => row.startsWith(name + "="))
            ?.split("=")[1];
    }

    function setCookie(name, value, days) {
        var d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + "=" + value + "; expires=" + d.toUTCString() + "; path=/";
    }

    if (!getCookie("acceptCookies")) {
        cookieAlert.classList.add("show");
    }

    acceptBtn.addEventListener("click", function () {
        setCookie("acceptCookies", "true", 365);
        cookieAlert.classList.remove("show");
        window.dispatchEvent(new Event("acceptCookies"));
    });
})();


/* =========================
   RESET UI
========================= */
function rezet() {
    $('#price_group').hide();
    $("#error_group").hide();

    if ($('.__calmodal').length) {
        $('.__calmodal').modal('hide');
    }
}


/* =========================
   NUMBER FORMAT (1,000)
========================= */
function numberWithCommas(n) {
    if (n === null || n === undefined) return "";

    var parts = n.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return parts.join(".");
}


/* =========================
   COPY TO CLIPBOARD
========================= */
function setClipboard(value) {
    if (!value) return;

    var tempInput = document.createElement("input");
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    tempInput.value = value;

    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
}


/* =========================
   PRELOADER
========================= */
function preloader() {
    var el = $('.preloader');

    if (el.length) {
        el.delay(100).fadeOut(500);
    }
}

$(window).on('load', function () {
    preloader();
});

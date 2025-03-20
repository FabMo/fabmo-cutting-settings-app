document.addEventListener("DOMContentLoaded", function () {
    // Get all tab links
    const navLinks = document.querySelectorAll("nav ul.left li a");
    const tabContents = document.querySelectorAll(".tabs-content .content");

    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent default anchor behavior

            // Remove active class from all tabs
            navLinks.forEach(item => item.parentElement.classList.remove("active"));
            tabContents.forEach(content => content.style.display = "none");

            // Add active class to the clicked tab
            this.parentElement.classList.add("active");

            // Show the corresponding content
            const targetId = this.getAttribute("href").substring(1); // Get the ID without #
            document.getElementById(targetId).style.display = "block";
        });
    });

    // Set the default active tab
    document.querySelector("nav ul.left li.active a").click();
});

var fabmo = new FabMoDashboard();
console.log(fabmo)

var config;
var variables;

$(document).ready(function () {
    $(document).on('change', function (e) {
        var keyVals = getKeyVals(e);
        console.log(keyVals);
        var cfg = { opensbp: { variables: {} } }
        cfg.opensbp.variables[keyVals[0]] = keyVals[1];
        fabmo.setConfig(cfg, function (err, data) {
            if (err) { return console.error(err); }
            update();
        });
    });

    update();

});

var getKeyVals = function (e) {
    var target = $(e.target)
    switch (target.prop('tagName').toLowerCase()) {
        case "a":
            return [target.data('variable'), target.data('value')]
        case "input":
            console.log(e.target.id);
            if (e.target.id === "custom-z") {
                console.log($('#ZZeroPlateThickness selcted'));
                $('#ZZeroPlateThickness').find(':selected').val(e.target.value);
                return ["SB_ZPLATETHICK", parseFloat(e.target.value)]
            } else {
                return [e.target.id, parseFloat(e.target.value)]
            }
        case "select":
            if (e.target.value != 0.118 && e.target.value != 0.57) {
                return [e.target.id, parseFloat($('#custom-z').val())]
            } else {
                return [e.target.id, parseFloat(e.target.value)]
            }
        default:
            return [e.target.id, parseFloat(e.target.value)]
    }
};

function update(config, err) {
    fabmo.getConfig(function (err, config) {
        if (err) {
            console.log(err);
        } else {
            var variables = config.opensbp.variables;
            for (var val in variables) {
                var target = $('#' + val);
                // if ( val === "custom-z") {
                //   return
                // }
                if (val === "SB_ZPLATETHICK") {
                    $("#SB_ZPLATETHICK option").each(function () {
                        if ($(this).html() === "Custom") {
                            if (variables[val] != 0.118 && variables[val] != 0.57) {
                                console.log(variables[val]);
                                $('#custom-z').val(variables[val]);
                                $(this).val(variables[val]);

                            }
                        }
                    });
                }
                if (target && target.length && val !== 'custom-z') {
                    switch (target.prop('tagName').toLowerCase()) {
                        case "div":
                            target.find('.select-button').each(function (idx) {
                                if ($(this).data('variable') == val) {
                                    if ($(this).data('value') == variables[val]) {
                                        $(this).addClass('is-primary');
                                    } else {
                                        $(this).removeClass('is-primary');
                                    }
                                }
                            });
                            break;
                        case 'select':
                            target.val(variables[val]);
                            if (target.find(':selected').html() === "Custom") {
                                $('#custom-z').val($('#SB_ZPLATETHICK').find(':selected').val());
                                $('#custom-z').show();
                            } else {
                                $('#custom-z').hide();
                            }
                            break;
                        case 'input':
                            target.val(variables[val]);
                            break;
                    }
                }
            }

            $('.expand-section').each(function (idx) {
                var section = $(this);
                if (variables[section.data('variable')] == section.data('expand-value')) {
                    section.slideDown();
                } else {
                    section.slideUp();
                }
            });
        }
    });
}

$('#allHome').click(function () {
    fabmo.runSBP('C3');
});

$('#zZero').click(function () {
    fabmo.runSBP('C2');
});

$('#runWarmUp').click(function () {
    fabmo.runSBP('C5');
});

$('#runSquare').click(function () {
    fabmo.runSBP('C10');
});


$('.panel-block').click(function () {
    var clicked = $(this).attr('id');
    $('.' + clicked).show();
    $('.panel').hide();
});

$('.delete').click(function () {
    $('.section').hide();
    $('.panel').show();
});



$('#set-offsets').click(function () {
    $.get('./files/offset.sbp', function (data) {
        var file = data.toString();
        fabmo.runSBP(file);
    })
});

$('.select-button').click(function (e) {
    e.preventDefault()
    var keyVals = getKeyVals(e);
    var cfg = { opensbp: { variables: {} } }
    cfg.opensbp.variables[keyVals[0]] = keyVals[1];
    fabmo.setConfig(cfg, function (err, data) {
        if (err) { return console.error(err); }
        update();
    });
});

fabmo.on('status', function (status) {
    console.info(status);
})
'use strict';
// Report filenames only; never echo the matching credential.
module.exports = /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-proj-[A-Za-z0-9_-]{30,}|https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|(?:sk_live_|sk_test_)[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}/;

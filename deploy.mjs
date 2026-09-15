import { execSync } from "node:child_process";

const SERVER = "deploy@134.209.152.144";
// New subdomain + legacy englishskill subdomain (same build, English Pro AI branding)
const TARGETS = ["/var/www/englishproai", "/var/www/englishskill"];

function run(command) {
  execSync(command, { stdio: "inherit", shell: true });
}

console.log("Building frontend...");
run("npm run build");

console.log("Ensuring deploy directories exist on server...");
run(`ssh ${SERVER} "mkdir -p ${TARGETS.join(" ")}"`);

for (const target of TARGETS) {
  console.log(`Syncing build to ${target}...`);
  // build/. copies directory contents (works on Windows and Unix)
  run(`scp -r build/. ${SERVER}:${target}/`);
}

console.log("Fixing permissions for nginx (www-data)...");
// scp from Windows can leave dirs at 700; nginx needs traverse + read access
run(
  `ssh ${SERVER} "chmod -R u+rwX,g+rwX,o+rX ${TARGETS.join(" ")}"`,
);

console.log("Reloading nginx...");
run(`ssh ${SERVER} "sudo nginx -t && sudo systemctl reload nginx"`);

console.log("Deployment completed successfully!");

export async function getProfile(req, res) {
  const id = req.params.id;
  console.log(id);

  res.send("profile");
}

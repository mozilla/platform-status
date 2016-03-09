function handleErrorResponse(err, res) {
  if (err.message === 'Not Found') {
    return res.sendStatus(404);
  }
  console.error(err.message);
  return res.sendStatus(500, err.message);
}

export default {
  handleErrorResponse,
};

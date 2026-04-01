const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: true,
        isAuthenticated: false,
        user: null,
      });
    }

    return res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default getMe;
